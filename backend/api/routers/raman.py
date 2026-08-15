"""Raman Spectroscopy API Router.

Provides REST endpoints for:
1. Raman Spectrum Processing & Peak Detection (POST /raman/process)
2. Raman Diagnostic Mode Library lookup (GET /raman/library)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from backend.api.dependencies import get_container, get_current_user_optional
from backend.services.raman_service import RAMAN_DIAGNOSTIC_MODES

router = APIRouter(prefix="/raman", tags=["Raman Spectroscopy"])


class RamanProcessRequest(BaseModel):
    raman_shifts: List[float] = Field(..., description="Raman shift in cm^-1")
    intensities: List[float] = Field(..., description="Intensity values")
    baseline_method: str = Field("poly", description="poly, linear, or none")
    poly_order: int = Field(3, ge=1, le=8, description="Polynomial order for baseline fitting")
    normalize_method: str = Field("max100", description="max100, area, or none")
    min_peak_prominence: float = Field(3.0, ge=0.0, description="Minimum peak prominence")


@router.post("/process")
async def process_raman_spectrum(
    request: RamanProcessRequest,
    container=Depends(get_container),
    user=Depends(get_current_user_optional),
):
    """Process a Raman spectrum: fluorescence baseline removal, normalization, peak detection, mode assignment, and ID/IG ratios."""
    try:
        service = container.raman_service
        result = await service.process_spectrum(
            raman_shifts=request.raman_shifts,
            intensities=request.intensities,
            baseline_method=request.baseline_method,
            poly_order=request.poly_order,
            normalize_method=request.normalize_method,
            min_peak_prominence=request.min_peak_prominence,
        )
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Raman processing error: {str(e)}")


@router.get("/library")
async def get_raman_library():
    """Return the reference library of diagnostic Raman vibrational modes."""
    return {"status": "success", "modes": RAMAN_DIAGNOSTIC_MODES}
