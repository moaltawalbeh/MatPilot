
"""AWS S3 storage provider (placeholder)."""

from typing import Optional
from backend.infrastructure.storage.storage_provider import IStorageProvider


class S3StorageProvider(IStorageProvider):
    """AWS S3 storage (future implementation)."""

    def __init__(self, bucket: str, region: str = "us-east-1"):
        self._bucket = bucket
        self._region = region

    @property
    def name(self) -> str:
        return "s3"

    async def store(self, file_id: str, data: bytes, folder: str = "uploads") -> str:
        return f"s3://{self._bucket}/{folder}/{file_id}"

    async def retrieve(self, uri: str) -> Optional[bytes]:
        return None

    async def delete(self, uri: str) -> bool:
        return False

    async def exists(self, uri: str) -> bool:
        return False

    def get_public_url(self, uri: str, expires_seconds: int = 3600) -> Optional[str]:
        return None
