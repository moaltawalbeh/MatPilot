"""Notifications API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/notifications", tags=["Notifications"])

_notifications: dict = {}


class NotificationCreateRequest(BaseModel):
    title: str
    message: str = ""
    type: str = "info"
    user_id: str = ""


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    user_id: str
    read: bool
    created_at: str


@router.get("")
async def list_notifications(
    unread_only: bool = Query(False),
    user_id: Optional[str] = Query(None),
):
    results = list(_notifications.values())
    if unread_only:
        results = [n for n in results if not n["read"]]
    if user_id:
        results = [n for n in results if n["user_id"] == user_id]
    unread_count = sum(1 for n in _notifications.values() if not n["read"])
    return {
        "notifications": [NotificationResponse(**n) for n in results],
        "unread_count": unread_count,
    }


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(notification_id: str):
    if notification_id not in _notifications:
        raise HTTPException(status_code=404, detail="Notification not found")
    _notifications[notification_id]["read"] = True
    return NotificationResponse(**_notifications[notification_id])


@router.post("/read-all")
async def mark_all_read():
    for n in _notifications.values():
        n["read"] = True
    return {"success": True, "message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str):
    if notification_id not in _notifications:
        raise HTTPException(status_code=404, detail="Notification not found")
    del _notifications[notification_id]
    return {"success": True, "message": f"Notification {notification_id} deleted"}
