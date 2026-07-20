"""Downloads API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/downloads", tags=["Downloads"])

_downloads: dict = {}


class DownloadCreateRequest(BaseModel):
    name: str
    description: str = ""
    format: str = "csv"
    source_type: str = ""
    source_id: str = ""
    options: Optional[dict] = None


class DownloadResponse(BaseModel):
    id: str
    name: str
    description: str
    format: str
    source_type: str
    source_id: str
    status: str
    options: dict
    file_path: Optional[str]
    created_at: str
    updated_at: str


@router.get("", response_model=List[DownloadResponse])
async def list_downloads():
    return [DownloadResponse(**d) for d in _downloads.values()]


@router.get("/{download_id}", response_model=DownloadResponse)
async def get_download(download_id: str):
    if download_id not in _downloads:
        raise HTTPException(status_code=404, detail="Download not found")
    return DownloadResponse(**_downloads[download_id])


@router.post("", response_model=DownloadResponse, status_code=201)
async def request_download(request: DownloadCreateRequest):
    now = datetime.now(timezone.utc).isoformat()
    download_id = str(uuid.uuid4())
    download = {
        "id": download_id,
        "name": request.name,
        "description": request.description,
        "format": request.format,
        "source_type": request.source_type,
        "source_id": request.source_id,
        "status": "pending",
        "options": request.options or {},
        "file_path": None,
        "created_at": now,
        "updated_at": now,
    }
    _downloads[download_id] = download
    return DownloadResponse(**download)


@router.delete("/{download_id}")
async def delete_download(download_id: str):
    if download_id not in _downloads:
        raise HTTPException(status_code=404, detail="Download not found")
    del _downloads[download_id]
    return {"success": True, "message": f"Download {download_id} deleted"}
