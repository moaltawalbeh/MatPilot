
from typing import List, Dict, Any, Optional, BinaryIO
from dataclasses import dataclass, field
from datetime import datetime
from uuid import uuid4
import os
import tempfile
import shutil

from backend.parsers.parser_factory import ParserFactory
from backend.parsers.parser_interface import IParser
from backend.domain.entities.xrd_experiment import XRDExperiment
from backend.domain.exceptions.domain_exceptions import (
    UnsupportedFormatException,
    ParserException,
    ValidationError
)


@dataclass
class UploadValidationResult:
    """Result of file validation before parsing."""
    is_valid: bool
    filename: str
    detected_format: Optional[str] = None
    file_size_bytes: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class UploadResult:
    """Result of a complete upload operation."""
    file_id: str
    filename: str
    detected_format: str
    is_valid: bool
    experiment: Optional[XRDExperiment] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    validation: UploadValidationResult = field(default_factory=lambda: UploadValidationResult(is_valid=False, filename=""))
    temp_path: Optional[str] = None
    uploaded_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class UploadService:
    """
    Upload Service.

    Orchestrates the complete upload flow:
    1. File validation (size, extension, magic bytes)
    2. Temporary storage
    3. Format detection
    4. Parser selection via ParserFactory
    5. Conversion to XRDExperiment
    6. Metadata extraction
    7. Cleanup

    The application layer never sees raw file bytes.
    """

    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    ALLOWED_EXTENSIONS = {".xrdml", ".raw", ".xy", ".csv", ".dat", ".txt", ".cif"}

    def __init__(self, parser_factory: ParserFactory, temp_dir: Optional[str] = None):
        self._parser_factory = parser_factory
        self._temp_dir = temp_dir or tempfile.gettempdir()
        self._upload_registry: Dict[str, UploadResult] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def upload_file(
        self,
        filename: str,
        content_type: str,
        file_data: bytes,
        user_metadata: Optional[Dict[str, Any]] = None
    ) -> UploadResult:
        """
        Upload a single file through the complete pipeline.

        Args:
            filename: Original filename
            content_type: MIME type
            file_data: Raw bytes
            user_metadata: Optional metadata from client

        Returns:
            UploadResult with file_id, detected_format, XRDExperiment, etc.
        """
        file_id = str(uuid4())
        user_metadata = user_metadata or {}

        # 1. Validate
        validation = self._validate_file(filename, file_data)
        if not validation.is_valid:
            return UploadResult(
                file_id=file_id,
                filename=filename,
                detected_format=validation.detected_format or "unknown",
                is_valid=False,
                validation=validation,
                metadata=user_metadata
            )

        # 2. Store temporarily
        temp_path = self._store_temporarily(file_id, file_data)

        # 3. Detect format & select parser
        parser = self._parser_factory.get_parser(filename)
        if parser is None:
            validation.errors.append(f"No parser registered for format: {filename}")
            validation.is_valid = False
            return UploadResult(
                file_id=file_id,
                filename=filename,
                detected_format="unknown",
                is_valid=False,
                validation=validation,
                temp_path=temp_path,
                metadata=user_metadata
            )

        detected_format = parser.format_name
        validation.detected_format = detected_format

        # 4. Parse to XRDExperiment
        try:
            experiment = await parser.parse(
                data=file_data,
                filename=filename,
                metadata=user_metadata
            )
        except Exception as exc:
            raise ParserException(f"Failed to parse {filename}: {exc}") from exc

        # 5. Enrich metadata
        extracted_metadata = self._extract_metadata(experiment, file_data, filename, content_type)
        extracted_metadata.update(user_metadata)

        # 6. Build result
        result = UploadResult(
            file_id=file_id,
            filename=filename,
            detected_format=detected_format,
            is_valid=True,
            experiment=experiment,
            validation=validation,
            temp_path=temp_path,
            metadata=extracted_metadata
        )

        self._upload_registry[file_id] = result
        return result

    async def upload_multiple(
        self,
        files: List[Dict[str, Any]]
    ) -> List[UploadResult]:
        """Upload multiple files sequentially."""
        results = []
        for file_info in files:
            result = await self.upload_file(
                filename=file_info["filename"],
                content_type=file_info.get("content_type", "application/octet-stream"),
                file_data=file_info["file_data"],
                user_metadata=file_info.get("metadata")
            )
            results.append(result)
        return results

    def get_upload(self, file_id: str) -> Optional[UploadResult]:
        """Retrieve a previous upload result by file_id."""
        return self._upload_registry.get(file_id)

    def list_uploads(self) -> List[UploadResult]:
        """List all uploads in this session."""
        return list(self._upload_registry.values())

    def cleanup(self, file_id: str) -> bool:
        """Remove temporary file and registry entry."""
        result = self._upload_registry.pop(file_id, None)
        if result and result.temp_path and os.path.exists(result.temp_path):
            os.remove(result.temp_path)
            return True
        return False

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _validate_file(self, filename: str, file_data: bytes) -> UploadValidationResult:
        """Validate file before parsing."""
        errors = []
        warnings = []
        detected_format = None

        # Extension check
        ext = os.path.splitext(filename.lower())[1]
        if ext not in self.ALLOWED_EXTENSIONS:
            errors.append(f"Extension '{ext}' not supported. Allowed: {self.ALLOWED_EXTENSIONS}")

        # Size check
        size = len(file_data)
        if size == 0:
            errors.append("File is empty.")
        elif size > self.MAX_FILE_SIZE:
            errors.append(f"File size {size} bytes exceeds limit {self.MAX_FILE_SIZE}.")

        # Magic bytes / content sniffing (lightweight)
        if ext == ".xrdml" and not file_data.startswith(b"<?xml") and b"<xrdMeasurements" not in file_data[:200]:
            warnings.append("File does not look like valid XRDML XML.")
        if ext == ".cif" and not file_data.strip().startswith(b"data_"):
            warnings.append("File does not look like valid CIF.")

        # Try to detect format via parser factory
        parser = self._parser_factory.get_parser(filename)
        if parser:
            detected_format = parser.format_name

        is_valid = len(errors) == 0

        return UploadValidationResult(
            is_valid=is_valid,
            filename=filename,
            detected_format=detected_format,
            file_size_bytes=size,
            errors=errors,
            warnings=warnings
        )

    def _store_temporarily(self, file_id: str, file_data: bytes) -> str:
        """Write file to temporary storage."""
        os.makedirs(self._temp_dir, exist_ok=True)
        temp_path = os.path.join(self._temp_dir, f"matpilot_{file_id}.tmp")
        with open(temp_path, "wb") as f:
            f.write(file_data)
        return temp_path

    def _extract_metadata(
        self,
        experiment: XRDExperiment,
        file_data: bytes,
        filename: str,
        content_type: str
    ) -> Dict[str, Any]:
        """Extract and merge metadata from all sources."""
        metadata = {
            "original_filename": filename,
            "content_type": content_type,
            "file_size_bytes": len(file_data),
            "data_points": experiment.data_points,
            "two_theta_range": (
                min(experiment.two_theta) if experiment.two_theta else None,
                max(experiment.two_theta) if experiment.two_theta else None
            ),
            "has_wavelength": experiment.wavelength is not None,
            "has_material": experiment.material is not None,
        }
        if experiment.wavelength:
            metadata["wavelength_angstrom"] = experiment.wavelength.value_angstrom
            metadata["radiation_type"] = experiment.wavelength.radiation_type.value
        return metadata
