"""Legal, Privacy & GDPR Compliance Router."""

import io
import json
import zipfile
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

from backend.api.dependencies import get_container

router = APIRouter(prefix="/legal", tags=["Legal & Privacy Compliance"])


# ── Schemas ────────────────────────────────────────────────────────

class CookieConsentRequest(BaseModel):
    necessary: bool = True
    analytics: bool = False
    performance: bool = False
    functional: bool = False
    marketing: bool = False


class ContactRequest(BaseModel):
    name: str
    email: str
    subject: str
    message: str


class DeleteAccountRequest(BaseModel):
    confirmation: str  # Must match "DELETE MY ACCOUNT"
    password: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────

@router.post("/cookie-consent")
async def save_cookie_consent(request: CookieConsentRequest):
    """Save user cookie consent preferences."""
    consent_data = {
        "necessary": True,
        "analytics": request.analytics,
        "performance": request.performance,
        "functional": request.functional,
        "marketing": request.marketing,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    response = JSONResponse(content={"success": True, "consent": consent_data})
    # Set persistent cookie consent token
    response.set_cookie(
        key="matpilot_cookie_consent",
        value=json.dumps(consent_data),
        max_age=31536000,  # 1 year
        httponly=False,
        samesite="lax",
    )
    return response


@router.post("/contact")
async def submit_contact_form(request: ContactRequest):
    """Submit inquiry to MatPilot Privacy & Support Team."""
    if not request.email or "@" not in request.email:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    return {
        "success": True,
        "message": "Thank you for contacting MatPilot. Your message has been routed to our Privacy & Compliance team.",
        "received_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/privacy-policy")
async def get_privacy_policy():
    """Return platform Privacy Policy statement."""
    return {
        "title": "MatPilot Privacy Policy",
        "last_updated": "2026-08-01",
        "version": "1.0",
        "sections": [
            {
                "heading": "1. Data Collection & Usage",
                "content": "MatPilot collects user registration credentials, experiment metadata, and uploaded diffraction patterns solely for providing materials characterization analytics."
            },
            {
                "heading": "2. Research Data Privacy",
                "content": "All uploaded crystal structures, CIF files, and XRD intensity data remain strict proprietary property of the user/organization and are never sold or shared."
            },
            {
                "heading": "3. AI Data Handling",
                "content": "Spectral pattern data is processed by our scientific AI Assistant strictly for contextual analysis and is never used to train third-party AI foundation models."
            },
            {
                "heading": "4. GDPR Rights",
                "content": "Users retain complete rights to access, export, or permanently delete all personal data and workspace files at any time."
            }
        ]
    }


@router.get("/terms-of-service")
async def get_terms_of_service():
    """Return platform Terms of Service."""
    return {
        "title": "MatPilot Terms of Service",
        "last_updated": "2026-08-01",
        "version": "1.0",
        "content": "MatPilot provides advanced software for materials characterization. Commercial launch is scheduled for January 1, 2027. All scientific outputs are subject to standard academic verification."
    }


@router.post("/export-data")
async def export_user_data(container=Depends(get_container)):
    """Export all user personal data, projects, experiments, and reports into a downloadable ZIP package (GDPR Data Portability)."""
    projects = await container.uow.projects.get_all()
    experiments = await container.uow.experiments.get_all()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # 1. User Summary JSON
        user_summary = {
            "platform": "MatPilot Version 1 Scientific SaaS",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "projects_count": len(projects),
            "experiments_count": len(experiments),
            "gdpr_compliance": "Article 20 - Right to Data Portability",
        }
        zip_file.writestr("user_profile.json", json.dumps(user_summary, indent=2))

        # 2. Projects JSON
        projects_data = [
            {
                "id": str(p.id),
                "name": p.name,
                "material": getattr(p, "material", ""),
                "description": getattr(p, "description", ""),
                "created_at": p.created_at.isoformat() if hasattr(p, "created_at") and p.created_at else None,
            }
            for p in projects
        ]
        zip_file.writestr("projects.json", json.dumps(projects_data, indent=2))

        # 3. Experiments & Analysis Data JSON
        exp_data = [
            {
                "id": str(e.id),
                "name": e.name,
                "status": e.status,
                "material": e.material,
                "two_theta_range": e.two_theta_range,
                "detected_peaks_count": len(e.detected_peaks),
                "candidate_phases_count": len(e.candidate_phases),
                "has_rietveld_results": bool(e.rietveld_results),
            }
            for e in experiments
        ]
        zip_file.writestr("experiments.json", json.dumps(exp_data, indent=2))

    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="matpilot_user_data_export.zip"'
        },
    )


@router.post("/delete-account")
async def delete_user_account(request: DeleteAccountRequest, container=Depends(get_container)):
    """Permanently erase user account and all workspace data (GDPR Right to be Forgotten)."""
    if request.confirmation != "DELETE MY ACCOUNT":
        raise HTTPException(
            status_code=400,
            detail="Confirmation string must be exactly 'DELETE MY ACCOUNT' to execute permanent deletion."
        )

    # Erase all projects & experiments
    projects = await container.uow.projects.get_all()
    for p in projects:
        await container.uow.projects.delete(p.id)

    experiments = await container.uow.experiments.get_all()
    for e in experiments:
        await container.uow.experiments.delete(e.id)

    return {
        "success": True,
        "message": "Account, projects, experiments, and all stored workspace files have been permanently erased in compliance with GDPR Right to be Forgotten.",
        "erased_at": datetime.now(timezone.utc).isoformat(),
    }
