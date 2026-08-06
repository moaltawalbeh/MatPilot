"""Ramanbase spectral database provider (live, token-gated).

Ramanbase (https://ramanbase.org) exposes a public REST API documented at
``https://api.ramanbase.org/api/docs/public/schema/``. Spectrum search and
download require an API token. When no token is configured the provider is
reported as unavailable and the instrument workspace falls back to other
providers — the connector is still fully implemented and enabled as soon as
``RAMANBASE_API_TOKEN`` is set.
"""

import logging
import os
from typing import Any, Dict, List, Optional

import httpx

from backend.reference.spectral_providers.interfaces import (
    ISpectralProvider,
    SpectralMatch,
    SpectralReference,
)

logger = logging.getLogger("ramanbase_provider")

API_BASE = "https://api.ramanbase.org"
SEARCH_PATH = "/api/v1/public/spectra/search"
DOWNLOAD_PATH = "/api/v1/public/spectra/{id}/download/processed"


class RamanbaseProvider(ISpectralProvider):
    """Live adapter for the Ramanbase public API."""

    def __init__(self, api_token: Optional[str] = None, api_base: str = API_BASE, timeout: float = 15.0):
        self._api_base = api_base.rstrip("/")
        self._timeout = timeout
        self._token = api_token if api_token is not None else os.getenv("RAMANBASE_API_TOKEN", "")
        self._availability: Optional[bool] = None

    @property
    def name(self) -> str:
        return "Ramanbase"

    @property
    def display_name(self) -> str:
        return "Ramanbase"

    @property
    def description(self) -> str:
        return (
            "Open Raman spectroscopy database with published experimental spectra. "
            "Requires a Ramanbase API token (set RAMANBASE_API_TOKEN)."
        )

    def is_available(self) -> bool:
        if not self._token:
            return False
        if self._availability is not None:
            return self._availability
        try:
            resp = httpx.get(f"{self._api_base}/api/v1/public/spectra/list", timeout=min(self._timeout, 5.0))
            self._availability = resp.status_code == 200
        except Exception:
            self._availability = False
        return self._availability

    def supported_features(self) -> List[str]:
        return ["library_search", "spectrum_download"]

    def version(self) -> Optional[str]:
        return "1.0.0"

    def supported_techniques(self) -> List[str]:
        return ["raman"]

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Token {self._token}"} if self._token else {}

    async def _post_json(self, path: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers=self._headers()) as client:
                resp = await client.post(f"{self._api_base}{path}", json=payload)
                if resp.status_code != 200:
                    logger.warning("Ramanbase %s returned %s", path, resp.status_code)
                    return None
                return resp.json() if isinstance(resp.json(), dict) else None
        except Exception as exc:  # pragma: no cover - network dependent
            logger.warning("Ramanbase %s failed: %s", path, exc)
            return None

    @staticmethod
    def _build_reference(entry: Dict[str, Any]) -> Optional[SpectralReference]:
        name = entry.get("name") or entry.get("filename") or ""
        rid = entry.get("id")
        if not name or rid is None:
            return None
        chemicals = entry.get("chemicals") or ""
        return SpectralReference(
            reference_id=f"ramanbase-{rid}",
            title=str(name),
            technique="raman",
            category=entry.get("sample_type") or "",
            formula=str(chemicals) if chemicals else None,
            x_axis="raman_shift",
            source="Ramanbase",
            source_url=f"https://ramanbase.org/spectra/{rid}",
            license=entry.get("licence"),
            metadata={"wavelength": entry.get("wavelength"), "raw": entry},
        )

    async def search(
        self,
        query: str,
        limit: int = 20,
        technique: Optional[str] = None,
    ) -> List[SpectralReference]:
        payload = {
            "filters": [{"field": "name", "operator": "contains", "value": query}],
            "ordering": "-time_created",
            "page": 1,
            "page_size": min(limit, 100),
        }
        data = await self._post_json(SEARCH_PATH, payload)
        results = (data or {}).get("results") or []
        refs: List[SpectralReference] = []
        for entry in results[:limit]:
            ref = self._build_reference(entry)
            if ref:
                refs.append(ref)
        return refs

    async def get_reference(self, reference_id: str) -> Optional[SpectralReference]:
        rid = reference_id.replace("ramanbase-", "")
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers=self._headers()) as client:
                resp = await client.get(f"{self._api_base}/api/v1/public/spectra/{rid}")
                if resp.status_code != 200:
                    return None
                entry = resp.json()
        except Exception as exc:  # pragma: no cover - network dependent
            logger.warning("Ramanbase get failed: %s", exc)
            return None
        ref = self._build_reference(entry) if isinstance(entry, dict) else None
        if ref is None:
            return None
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers=self._headers()) as client:
                down = await client.get(
                    f"{self._api_base}{DOWNLOAD_PATH.format(id=rid)}"
                )
                if down.status_code == 200:
                    payload = down.json()
                    x = payload.get("x")
                    y = payload.get("y")
                    if isinstance(x, list) and isinstance(y, list):
                        ref.x = [float(v) for v in x]
                        ref.y = [float(v) for v in y]
        except Exception as exc:  # pragma: no cover - network dependent
            logger.warning("Ramanbase download failed: %s", exc)
        return ref

    async def match_spectrum(
        self,
        x: List[float],
        y: List[float],
        limit: int = 10,
        technique: Optional[str] = None,
    ) -> List[SpectralMatch]:
        # Ramanbase comparison is an async file-upload job; not exercised by the
        # instrument workspace yet. Name search doubles as the match entry point.
        return []
