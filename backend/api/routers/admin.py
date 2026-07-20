"""Admin API endpoints."""

from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Admin"])

_users: dict = {}


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str
    created_at: str
    updated_at: str


class UserUpdateRequest(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None


@router.get("/users", response_model=List[UserResponse])
async def list_users():
    return [UserResponse(**u) for u in _users.values()]


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    if user_id not in _users:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**_users[user_id])


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, request: UserUpdateRequest):
    if user_id not in _users:
        raise HTTPException(status_code=404, detail="User not found")
    user = _users[user_id]
    updates = request.model_dump(exclude_unset=True)
    user.update(updates)
    return UserResponse(**user)
