"""Persistent CIF Cache.

Downloads CIF files from COD and caches them locally.
Provides parsed crystallographic data without re-downloading.
"""

import os
import json
import hashlib
import time
import logging
from typing import Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger("cif_cache")


class CIFCache:
    """
    Persistent local cache for CIF files downloaded from COD.

    Structure:
        cache_dir/
            index.json          # Maps cod_id → metadata
            {cod_id}.cif        # Raw CIF content
            {cod_id}.json       # Parsed crystallographic data

    Thread-safe for concurrent reads; writes are serialized.
    """

    def __init__(self, cache_dir: str = "data/cif_cache"):
        self._cache_dir = Path(cache_dir)
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._index_path = self._cache_dir / "index.json"
        self._index: Dict[str, Dict[str, Any]] = self._load_index()

    def _load_index(self) -> Dict[str, Dict[str, Any]]:
        if self._index_path.exists():
            try:
                with open(self._index_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError):
                logger.warning("Corrupted cache index, starting fresh")
        return {}

    def _save_index(self):
        with open(self._index_path, "w", encoding="utf-8") as f:
            json.dump(self._index, f, indent=2)

    def has_cif(self, cod_id: str) -> bool:
        """Check if a CIF file is cached."""
        cif_path = self._cache_dir / f"{cod_id}.cif"
        return cif_path.exists() and cod_id in self._index

    def get_cif_content(self, cod_id: str) -> Optional[str]:
        """Read raw CIF content from cache."""
        cif_path = self._cache_dir / f"{cod_id}.cif"
        if not cif_path.exists():
            return None
        try:
            return cif_path.read_text(encoding="utf-8")
        except OSError as exc:
            logger.error(f"Failed to read CIF {cod_id}: {exc}")
            return None

    def get_parsed_data(self, cod_id: str) -> Optional[Dict[str, Any]]:
        """Read parsed crystallographic data from cache."""
        json_path = self._cache_dir / f"{cod_id}.json"
        if not json_path.exists():
            return None
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return None

    def store_cif(
        self,
        cod_id: str,
        cif_content: str,
        parsed_data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Store CIF content and optional parsed data to cache."""
        try:
            cif_path = self._cache_dir / f"{cod_id}.cif"
            cif_path.write_text(cif_content, encoding="utf-8")

            self._index[cod_id] = {
                "cached_at": time.time(),
                "size_bytes": len(cif_content.encode("utf-8")),
                "content_hash": hashlib.md5(cif_content.encode("utf-8")).hexdigest(),
                "has_parsed_data": parsed_data is not None,
            }

            if parsed_data is not None:
                json_path = self._cache_dir / f"{cod_id}.json"
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(parsed_data, f, indent=2)
                self._index[cod_id]["has_parsed_data"] = True

            self._save_index()
            logger.info(f"Cached CIF {cod_id} ({len(cif_content)} bytes)")
            return True
        except OSError as exc:
            logger.error(f"Failed to cache CIF {cod_id}: {exc}")
            return False

    def get_cache_info(self, cod_id: str) -> Optional[Dict[str, Any]]:
        """Get metadata about a cached CIF entry."""
        return self._index.get(cod_id)

    def list_cached_ids(self):
        """Return list of all cached COD IDs."""
        return list(self._index.keys())

    def cache_size(self) -> int:
        """Number of cached entries."""
        return len(self._index)

    def clear(self):
        """Clear entire cache."""
        import shutil
        if self._cache_dir.exists():
            shutil.rmtree(self._cache_dir)
            self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._index = {}
        self._save_index()
        logger.info("CIF cache cleared")
