
"""Google Cloud Storage provider (placeholder)."""

from typing import Optional
from backend.infrastructure.storage.storage_provider import IStorageProvider


class GCSStorageProvider(IStorageProvider):
    """Google Cloud Storage (future implementation)."""

    def __init__(self, bucket: str):
        self._bucket = bucket

    @property
    def name(self) -> str:
        return "gcs"

    async def store(self, file_id: str, data: bytes, folder: str = "uploads") -> str:
        return f"gcs://{self._bucket}/{folder}/{file_id}"

    async def retrieve(self, uri: str) -> Optional[bytes]:
        return None

    async def delete(self, uri: str) -> bool:
        return False

    async def exists(self, uri: str) -> bool:
        return False

    def get_public_url(self, uri: str, expires_seconds: int = 3600) -> Optional[str]:
        return None
