"""Commercial Billing Infrastructure & Subscription Tier Router."""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])


class SubscribeRequest(BaseModel):
    plan_id: str  # student, pro, group, enterprise
    billing_cycle: str = "monthly"  # monthly or annual


SUBSCRIPTION_PLANS = [
    {
        "id": "student",
        "name": "Student Researcher",
        "price_monthly": 0,
        "price_annual": 0,
        "features": [
            "Basic XRD Phase Identification",
            "Up to 5 Projects & 50 Experiments",
            "Standard PDF Reports",
            "Community Support",
        ],
        "badge": "Free",
        "cta": "Get Started Free",
    },
    {
        "id": "pro",
        "name": "Researcher Pro",
        "price_monthly": 29,
        "price_annual": 24,
        "popular": True,
        "features": [
            "Unlimited XRD, Raman, FTIR & SEM Analysis",
            "Automated & Manual Rietveld Refinement",
            "Grounded AI Scientific Assistant",
            "Publication-Quality PDF, DOCX, TXT, PPTX Reports",
            "Priority Cloud Processing Queue",
            "Williamson–Hall & Size-Strain Plotting",
        ],
        "badge": "Most Popular",
        "cta": "Pre-Register for Pro",
    },
    {
        "id": "group",
        "name": "Research Group",
        "price_monthly": 99,
        "price_annual": 79,
        "features": [
            "Everything in Researcher Pro",
            "Up to 10 Team Members",
            "Shared Group Workspace & Collaboration",
            "Centralized Data Storage & CIF Library",
            "Organization Role-Based Access Control",
            "Dedicated Support Account Manager",
        ],
        "badge": "Team Plan",
        "cta": "Pre-Register for Group",
    },
    {
        "id": "enterprise",
        "name": "Enterprise Platform",
        "price_monthly": None,
        "price_annual": None,
        "features": [
            "Unlimited Users & Dedicated Infrastructure",
            "Custom Instrument Ecosystem Integrations",
            "Enterprise Security & Audit Logging",
            "Programmatic API Access & Webhooks",
            "Single Sign-On (SAML / OAuth / ORCID)",
            "On-Premise / Private Cloud Deployment",
        ],
        "badge": "Custom R&D",
        "cta": "Contact Sales",
    },
]


@router.get("/plans")
async def get_subscription_plans():
    """Get available commercial subscription plans and launch info."""
    return {
        "commercial_launch_notice": "Commercial subscriptions will launch on January 1, 2027.",
        "launch_date": "2027-01-01",
        "currency": "USD",
        "plans": SUBSCRIPTION_PLANS,
    }


@router.post("/subscribe")
async def create_subscription(request: SubscribeRequest):
    """Pre-register or initiate checkout for a subscription plan."""
    valid_ids = [p["id"] for p in SUBSCRIPTION_PLANS]
    if request.plan_id not in valid_ids:
        raise HTTPException(status_code=400, detail=f"Invalid plan ID: {request.plan_id}")

    return {
        "success": True,
        "message": f"Pre-registration recorded for '{request.plan_id.title()}' plan. Commercial billing activates on January 1, 2027.",
        "plan_id": request.plan_id,
        "billing_cycle": request.billing_cycle,
        "commercial_launch_date": "2027-01-01",
        "stripe_integration_status": "Ready for Stripe Checkout",
    }
