"""FTIR Spectroscopy API Router.

Provides REST endpoints for:
1. FTIR Spectrum Processing & Peak Detection (POST /ftir/process)
2. Functional Group Library lookup (GET /ftir/library)
3. Analytical Report Generation (POST /ftir/report)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from backend.api.dependencies import get_container, get_current_user_optional
from backend.services.ftir_service import IR_FUNCTIONAL_GROUPS

router = APIRouter(prefix="/ftir", tags=["FTIR Spectroscopy"])


class FTIRProcessRequest(BaseModel):
    wavenumbers: List[float] = Field(..., description="Wavenumbers in cm^-1")
    intensities: List[float] = Field(..., description="Intensity or absorbance values")
    baseline_method: str = Field("poly", description="poly, linear, or none")
    poly_order: int = Field(2, ge=1, le=8, description="Polynomial order for baseline fitting")
    normalize_method: str = Field("max100", description="max100, minmax, or none")
    min_peak_prominence: float = Field(2.0, ge=0.0, description="Minimum peak prominence")
    spectrum_type: str = Field("absorbance", description="absorbance or transmittance")


class FTIRReportRequest(BaseModel):
    sample_name: str = "FTIR Sample"
    wavenumbers: List[float]
    intensities: List[float]
    processing_result: Dict[str, Any]


@router.post("/process")
async def process_ftir_spectrum(
    request: FTIRProcessRequest,
    container=Depends(get_container),
    user=Depends(get_current_user_optional),
):
    """Process an FTIR spectrum: baseline correction, normalization, peak detection, and functional group assignment."""
    try:
        service = container.ftir_service
        result = await service.process_spectrum(
            wavenumbers=request.wavenumbers,
            intensities=request.intensities,
            baseline_method=request.baseline_method,
            poly_order=request.poly_order,
            normalize_method=request.normalize_method,
            min_peak_prominence=request.min_peak_prominence,
            spectrum_type=request.spectrum_type,
        )
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FTIR processing error: {str(e)}")


@router.get("/library")
async def get_ftir_library():
    """Return the reference library of diagnostic FTIR functional group bands."""
    return {"status": "success", "groups": IR_FUNCTIONAL_GROUPS}


@router.post("/report")
async def generate_ftir_report(
    request: FTIRReportRequest,
    container=Depends(get_container),
    user=Depends(get_current_user_optional),
):
    """Generate a comprehensive FTIR analytical characterization report."""
    try:
        service = container.ftir_service
        report = await service.generate_ftir_report(
            sample_name=request.sample_name,
            wavenumbers=request.wavenumbers,
            intensities=request.intensities,
            processing_result=request.processing_result,
        )
        return {"status": "success", "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")
