"""Activity recording middleware.

Automatically records activity log entries for POST, PUT, DELETE operations.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from datetime import datetime
from uuid import uuid4
import json


class ActivityRecorderMiddleware(BaseHTTPMiddleware):
    """Records activities for mutating API requests."""
    
    # Paths to record activities for
    WATCHED_PATHS = {
        "POST": {
            "/upload": ("FILE_UPLOADED", "file", "File uploaded"),
            "/projects": ("PROJECT_CREATED", "project", "Project created"),
            "/samples": ("SAMPLE_CREATED", "sample", "Sample created"),
            "/measurements": ("MEASUREMENT_STARTED", "measurement", "Measurement started"),
            "/structures": ("STRUCTURE_IMPORTED", "structure", "Structure imported"),
            "/collections": ("COLLECTION_CREATED", "collection", "Collection created"),
            "/experiments": ("PROJECT_CREATED", "experiment", "Experiment created"),
        },
        "PUT": {
            "/projects": ("PROJECT_UPDATED", "project", "Project updated"),
            "/samples": ("SAMPLE_UPDATED", "sample", "Sample updated"),
        },
    }
    
    def __init__(self, app):
        super().__init__(app)
        self.activities = []  # In-memory activity store
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Only record successful mutating operations
        if request.method in self.WATCHED_PATHS and 200 <= response.status_code < 300:
            path_prefix = "/" + request.url.path.strip("/").split("/")[0]
            method_paths = self.WATCHED_PATHS.get(request.method, {})
            if path_prefix in method_paths:
                activity_type, source_type, title = method_paths[path_prefix]
                activity = {
                    "id": str(uuid4()),
                    "activity_type": activity_type,
                    "title": title,
                    "description": f"{request.method} {request.url.path}",
                    "source_type": source_type,
                    "source_id": None,
                    "project_id": None,
                    "metadata": {"method": request.method, "path": request.url.path},
                    "created_at": datetime.utcnow().isoformat(),
                }
                self.activities.append(activity)
        
        return response
