"""Architected spectral providers that are not yet live.

These databases have no public, unauthenticated REST API (or license terms
prevent direct programmatic search), so the connectors below are fully
implemented against the :class:`ISpectralProvider` contract but report
themselves as unavailable. They document the intended integration path so a
future backend can fill them in without touching the instrument workspaces.
"""

from typing import List, Optional

from backend.reference.spectral_providers.interfaces import (
    ISpectralProvider,
    SpectralMatch,
    SpectralReference,
)


class _ArchivedSpectralProvider(ISpectralProvider):
    """Base for providers that are architected but not yet wired live."""

    name_key = "archived"
    display = "Archived"
    blurb = ""
    techniques: List[str] = []
    features: List[str] = []
    version_no = "planned"

    @property
    def name(self) -> str:
        return self.name_key

    @property
    def display_name(self) -> str:
        return self.display

    @property
    def description(self) -> str:
        return self.blurb

    def is_available(self) -> bool:
        return False

    def supported_features(self) -> List[str]:
        return self.features

    def version(self) -> Optional[str]:
        return self.version_no

    def supported_techniques(self) -> List[str]:
        return self.techniques

    async def search(self, query: str, limit: int = 20, technique: Optional[str] = None) -> List[SpectralReference]:
        return []

    async def get_reference(self, reference_id: str) -> Optional[SpectralReference]:
        return None

    async def match_spectrum(
        self, x: List[float], y: List[float], limit: int = 10, technique: Optional[str] = None
    ) -> List[SpectralMatch]:
        return []


class OpenSpecyProvider(_ArchivedSpectralProvider):
    """Open Specy (community microplastics / environmental FTIR & Raman).

    The historical public REST API (``api.openspecy.org/library/search``,
    ``/search``) was retired: the host now 302-redirects to the web app
    (``https://www.openanalysis.org/openspecy/``), which serves the reference
    library from local WASM files. The reference data is distributed only as
    R-serialized bulk files on OSF (DOI 10.17605/OSF.IO/X7DPZ): ``derivative.rds``
    (~42 MB), ``raman_library.rds`` (~48 MB), ``medoid_derivative.rds`` (~5 MB),
    plus metadata. Integration path: an offline importer that downloads the
    medoid/small libraries, converts them (Python ``rdata`` currently rejects the
    RDS format, so a converter or mirrored CSV export is needed) and registers
    them into the local reference library.
    """

    name_key = "OpenSpecy"
    display = "Open Specy"
    blurb = (
        "Community FTIR/Raman library. REST API retired; data on OSF as R-serialized "
        "bulk files. Planned offline import."
    )
    techniques = ["ftir", "raman"]
    features = ["library_search", "spectral_matching", "spectrum_download"]


class SDBSProvider(_ArchivedSpectralProvider):
    """SDBS (Spectral Database for Organic Compounds, AIST Japan).

    FTIR / Raman spectra for organic compounds. No public search API; bulk
    access is licensed. Integration path: periodic offline import of the SDBS
    distribution files into the local reference library.
    """

    name_key = "SDBS"
    display = "SDBS"
    blurb = (
        "SDBS (AIST) organic-compound FTIR/Raman spectra. No public API; "
        "planned offline import."
    )
    techniques = ["ftir", "raman"]
    features = ["library_search", "peak_matching"]


class NISTWebBookProvider(_ArchivedSpectralProvider):
    """NIST Chemistry WebBook / NIST Vibrational Spectra Database.

    IR spectra for thousands of compounds. No stable public JSON API; the HTML
    interface is not suitable for automated queries. Planned: maintain a local
    index of downloaded NIST IR spectra.
    """

    name_key = "NIST"
    display = "NIST WebBook"
    blurb = (
        "NIST Chemistry WebBook IR spectra. No stable public API; planned local "
        "index of NIST vibrational spectra."
    )
    techniques = ["ftir"]
    features = ["library_search"]


class PhotochemCADProvider(_ArchivedSpectralProvider):
    """PhotochemCAD (UV-Vis absorption spectra of chromophores).

    Spectral data for hundreds of dyes and photosensitizers, freely available
    as files but without a search API. Planned: import the PhotochemCAD spectral
    files into the UV-Vis reference library.
    """

    name_key = "PhotochemCAD"
    display = "PhotochemCAD"
    blurb = (
        "PhotochemCAD UV-Vis absorption spectra of chromophores and dyes. "
        "Available as files, no API; planned import."
    )
    techniques = ["uvvis"]
    features = ["library_search"]


class RamanOpenDBProvider(_ArchivedSpectralProvider):
    """Raman Open Database.

    Openly licensed Raman spectra database. No public query API; data is shared
    through bulk exports. Planned: periodic import into the local library.
    """

    name_key = "RamanOpenDB"
    display = "Raman Open Database"
    blurb = (
        "Openly licensed Raman spectra. No public query API; planned bulk import."
    )
    techniques = ["raman"]
    features = ["library_search", "peak_matching"]


class SpectraBaseProvider(_ArchivedSpectralProvider):
    """SpectraBase (Wiley).

    One of the largest commercial spectral libraries (FTIR, Raman, NMR, MS).
    Access requires a license; the connector is architected for a credentialed
    integration and stays offline until credentials are provisioned.
    """

    name_key = "SpectraBase"
    display = "SpectraBase (Wiley)"
    blurb = (
        "Commercial Wiley spectral library (FTIR/Raman). Licensed access only; "
        "architected for credentialed integration."
    )
    techniques = ["ftir", "raman"]
    features = ["library_search", "spectral_matching"]


class RRUFFProvider(_ArchivedSpectralProvider):
    """RRUFF Project mineral spectral database.

    Raman, IR and powder XRD for minerals. No public search REST API — data is
    distributed as bulk ZIP downloads (``rruff.net/zipped_data_files``).
    Planned: mirror the RRUFF Raman/IR sets into the local reference library.
    """

    name_key = "RRUFF"
    display = "RRUFF Project"
    blurb = (
        "RRUFF mineral Raman/IR database. Bulk ZIP distribution only, no search "
        "API; planned local mirror for mineral identification."
    )
    techniques = ["raman", "ftir"]
    features = ["library_search", "peak_matching", "spectrum_download"]
