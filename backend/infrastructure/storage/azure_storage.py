
"""Azure Blob storage provider (placeholder)."""

from typing import Optional
from backend.infrastructure.storage.storage_provider import IStorageProvider


class AzureStorageProvider(IStorageProvider):
    """Azure Blob storage (future implementation)."""

    def __init__(self, container: str):
        self._container = container

    @property
    def name(self) -> str:
        return "azure"

    async def store(self, file_id: str, data: bytes, folder: str = "uploads") -> str:
        return f"azure://{self._container}/{folder}/{file_id}"

    async def retrieve(self, uri: str) -> Optional[bytes]:
        return None

    async def delete(self, uri: str) -> bool:
        return False

    async def exists(self, uri: str) -> bool:
        return False

    def get_public_url(self, uri: str, expires_seconds: int = 3600) -> Optional[str]:
        return None
