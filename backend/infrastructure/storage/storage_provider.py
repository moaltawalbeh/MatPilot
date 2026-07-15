
"""Storage Provider abstraction.

All file storage goes through this interface.
Supports local disk, S3, Azure Blob, GCS.
"""

from abc import ABC, abstractmethod
from typing import BinaryIO, Optional
from uuid import UUID


class IStorageProvider(ABC):
    """
    Interface for all storage backends.

    The platform never writes directly to disk.
    All storage operations go through this provider.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name."""
        raise NotImplementedError

    @abstractmethod
    async def store(self, file_id: str, data: bytes, folder: str = "uploads") -> str:
        """
        Store data and return a URI/path.

        Args:
            file_id: Unique file identifier
            data: Raw bytes to store
            folder: Logical folder/category

        Returns:
            Storage URI (e.g., "local://uploads/abc" or "s3://bucket/uploads/abc")
        """
        raise NotImplementedError

    @abstractmethod
    async def retrieve(self, uri: str) -> Optional[bytes]:
        """Retrieve data by URI."""
        raise NotImplementedError

    @abstractmethod
    async def delete(self, uri: str) -> bool:
        """Delete data by URI."""
        raise NotImplementedError

    @abstractmethod
    async def exists(self, uri: str) -> bool:
        """Check if data exists."""
        raise NotImplementedError

    @abstractmethod
    def get_public_url(self, uri: str, expires_seconds: int = 3600) -> Optional[str]:
        """Get a public URL for the stored object (if supported)."""
        raise NotImplementedError


class StorageException(Exception):
    """Base exception for storage operations."""
    pass


class StorageNotFoundException(StorageException):
    """Raised when a stored object is not found."""
    pass


class StoragePermissionException(StorageException):
    """Raised when storage access is denied."""
    pass
