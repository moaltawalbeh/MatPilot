
"""Local filesystem storage provider."""

import os
from typing import Optional

from backend.infrastructure.storage.storage_provider import (
    IStorageProvider, StorageException, StorageNotFoundException
)


class LocalStorageProvider(IStorageProvider):
    """
    Local filesystem storage.

    Stores files in a base directory with subfolders.
    """

    def __init__(self, base_path: str = "./storage"):
        self._base_path = os.path.abspath(base_path)
        os.makedirs(self._base_path, exist_ok=True)

    @property
    def name(self) -> str:
        return "local"

    async def store(self, file_id: str, data: bytes, folder: str = "uploads") -> str:
        folder_path = os.path.join(self._base_path, folder)
        os.makedirs(folder_path, exist_ok=True)

        file_path = os.path.join(folder_path, file_id)
        try:
            with open(file_path, "wb") as f:
                f.write(data)
        except OSError as exc:
            raise StorageException(f"Failed to store {file_id}: {exc}") from exc

        return f"local://{folder}/{file_id}"

    async def retrieve(self, uri: str) -> Optional[bytes]:
        path = self._uri_to_path(uri)
        if not os.path.exists(path):
            raise StorageNotFoundException(f"File not found: {uri}")
        try:
            with open(path, "rb") as f:
                return f.read()
        except OSError as exc:
            raise StorageException(f"Failed to retrieve {uri}: {exc}") from exc

    async def delete(self, uri: str) -> bool:
        path = self._uri_to_path(uri)
        if not os.path.exists(path):
            return False
        try:
            os.remove(path)
            return True
        except OSError:
            return False

    async def exists(self, uri: str) -> bool:
        path = self._uri_to_path(uri)
        return os.path.exists(path)

    def get_public_url(self, uri: str, expires_seconds: int = 3600) -> Optional[str]:
        # Local storage does not support public URLs
        return None

    def _uri_to_path(self, uri: str) -> str:
        """Convert local://folder/file_id to filesystem path."""
        if uri.startswith("local://"):
            relative = uri[8:]  # Remove "local://"
        else:
            relative = uri
        path = os.path.normpath(os.path.join(self._base_path, relative))
        # Path containment validation — prevent directory traversal
        if not path.startswith(self._base_path):
            raise StorageException(f"Invalid storage path: {uri}")
        return path
