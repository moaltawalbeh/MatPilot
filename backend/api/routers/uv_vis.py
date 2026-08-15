"""UV-Vis Spectroscopy API Router.

Provides REST endpoints for:
1. UV-Vis / Diffuse Reflectance Spectrum Analysis (POST /uv_vis/analyze)
2. Kubelka-Munk transformation and automatic/manual Tauc plot band gap estimation
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Tuple

from backend.api.dependencies import get_container, get_current_user_optional

router = APIRouter(prefix="/uv_vis", tags=["UV-Vis Spectroscopy"])


class UVVisAnalyzeRequest(BaseModel):
    wavelengths: List[float] = Field(..., description="Wavelengths in nm")
    intensities: List[float] = Field(..., description="Intensity, absorbance, transmittance, or reflectance values")
    spectrum_type: str = Field("absorbance", description="absorbance, transmittance, or reflectance")
    transition_type: str = Field("direct_allowed", description="direct_allowed, indirect_allowed, direct_forbidden, indirect_forbidden")
    manual_range: Optional[Tuple[float, float]] = Field(None, description="Optional manual (min_eV, max_eV) range for linear fit")


@router.post("/analyze")
async def analyze_uvvis_spectrum(
    request: UVVisAnalyzeRequest,
    container=Depends(get_container),
    user=Depends(get_current_user_optional),
):
    """Analyze UV-Vis spectrum: transform to Tauc coordinates, detect absorption edge, and estimate optical band gap E_g."""
    try:
        service = container.uv_vis_service
        result = await service.analyze_spectrum(
            wavelengths=request.wavelengths,
            intensities=request.intensities,
            spectrum_type=request.spectrum_type,
            transition_type=request.transition_type,
            manual_range=request.manual_range,
        )
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"UV-Vis analysis error: {str(e)}")
