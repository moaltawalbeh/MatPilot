"""Manual Refinement API Router.

Endpoints for interactive step-by-step Rietveld refinement
with parameter lock/unlock control.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services.manual_refinement_service import ManualRefinementService

router = APIRouter(prefix="/manual-refinement", tags=["manual-refinement"])

_service = ManualRefinementService()


# ── Request / Response models ────────────────────────────────────────

class InitSessionRequest(BaseModel):
    experiment_id: str
    phase_cifs: list = Field(default_factory=list)
    wavelength: Optional[float] = 1.5406


class InitSessionResponse(BaseModel):
    session_id: str
    parameters: list
    last_result: Optional[dict] = None
    current_step: int = 0
    history: list = []


class SetParameterRequest(BaseModel):
    value: Optional[float] = None
    locked: Optional[bool] = None


class LockUnlockRequest(BaseModel):
    param_names: List[str]


# ── Endpoints ────────────────────────────────────────────────────────

@router.get("/parameters")
async def list_parameters():
    """List all available refinable parameter definitions."""
    return _service.get_available_parameters()


@router.post("/init")
async def init_session(req: InitSessionRequest):
    """Initialize a new manual refinement session.

    Loads diffraction data and phase CIFs, runs an initial auto-refinement
    to seed parameter values, and returns the full session state.
    """
    if not req.phase_cifs:
        raise HTTPException(status_code=400, detail="phase_cifs is required and must not be empty")

    session_id = f"mr-{uuid.uuid4().hex[:12]}"

    try:
        state = _service.init_session(
            session_id=session_id,
            experiment_id=req.experiment_id,
            two_theta=[],
            intensity=[],
            phase_cifs=req.phase_cifs,
            wavelength=req.wavelength or 1.5406,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "session_id": state["session_id"],
        "parameters": state["parameters"],
        "last_result": state["last_result"],
        "current_step": state["current_step"],
        "history": state["history"],
    }


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Get current session state including all parameters and last result."""
    try:
        return _service.get_session_state(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")


@router.put("/{session_id}/parameters/{param_name}")
async def set_parameter(session_id: str, param_name: str, req: SetParameterRequest):
    """Set value and/or lock state of a single parameter."""
    try:
        return _service.set_parameter(session_id, param_name, value=req.value, locked=req.locked)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{session_id}/lock")
async def lock_parameters(session_id: str, req: LockUnlockRequest):
    """Lock multiple parameters (they will not be refined)."""
    try:
        return _service.lock_parameters(session_id, req.param_names)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")


@router.post("/{session_id}/unlock")
async def unlock_parameters(session_id: str, req: LockUnlockRequest):
    """Unlock multiple parameters (they will be refined)."""
    try:
        return _service.unlock_parameters(session_id, req.param_names)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")


@router.post("/{session_id}/step")
async def run_step(session_id: str):
    """Run one refinement step, only refining unlocked parameters."""
    try:
        return _service.run_step(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/full")
async def run_full(session_id: str):
    """Unlock all parameters and run full refinement."""
    try:
        return _service.run_full_refinement(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/undo")
async def undo(session_id: str):
    """Undo the last refinement step."""
    try:
        return _service.undo_step(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")


@router.post("/{session_id}/reset")
async def reset(session_id: str):
    """Reset all parameters to initial values."""
    try:
        return _service.reset_session(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Delete a refinement session."""
    deleted = _service.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    return {"success": True, "message": f"Session {session_id} deleted"}
