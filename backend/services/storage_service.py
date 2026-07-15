
"""Storage Service.

High-level storage operations for the application.
Wraps the StorageProvider abstraction.
"""

from backend.infrastructure.storage.storage_provider import IStorageProvider


class StorageService:
    """
    Application-level storage service.

    Provides semantic operations:
    - store_upload()
    - store_result()
    - store_report()
    - retrieve_experiment()

    All operations delegate to the configured StorageProvider.
    """

    def __init__(self, provider: IStorageProvider):
        self._provider = provider

    @property
    def provider_name(self) -> str:
        return self._provider.name

    async def store_upload(self, file_id: str, data: bytes) -> str:
        """Store an uploaded file."""
        return await self._provider.store(file_id, data, folder="uploads")

    async def store_result(self, result_id: str, data: bytes) -> str:
        """Store an analysis result."""
        return await self._provider.store(result_id, data, folder="results")

    async def store_report(self, report_id: str, data: bytes) -> str:
        """Store a generated report."""
        return await self._provider.store(report_id, data, folder="reports")

    async def retrieve(self, uri: str) -> bytes:
        """Retrieve data by URI."""
        data = await self._provider.retrieve(uri)
        if data is None:
            raise ValueError(f"Data not found at {uri}")
        return data

    async def delete(self, uri: str) -> bool:
        """Delete data by URI."""
        return await self._provider.delete(uri)

    async def exists(self, uri: str) -> bool:
        """Check if data exists."""
        return await self._provider.exists(uri)
