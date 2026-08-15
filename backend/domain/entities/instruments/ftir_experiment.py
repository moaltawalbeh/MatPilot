from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from .base_instrument import BaseInstrumentExperiment

@dataclass
class FTIRExperiment(BaseInstrumentExperiment):
    """
    Domain entity specifically for FTIR Spectroscopy.
    Inherits base properties and adds FTIR-specific fields.
    """
    def __post_init__(self):
        self.instrument_type = "FTIR"
        
    # FTIR specific raw data
    raw_wavenumbers: Optional[List[float]] = None
    raw_transmittance: Optional[List[float]] = None
    
    # Processed states
    processed_transmittance: Optional[List[float]] = None
    
    # FTIR Metadata
    resolution_cm1: Optional[float] = None
    scan_count: Optional[int] = None
    background_type: Optional[str] = None
    
    # Scientific Results
    detected_peaks: List[Dict[str, Any]] = field(default_factory=list) # Includes wavenumber, intensity
    functional_groups: List[Dict[str, Any]] = field(default_factory=list) # Mapped from peaks
    library_matches: List[Dict[str, Any]] = field(default_factory=list) # From OpenSpecy/SDBS
    
    # Metrics
    signal_to_noise_ratio: Optional[float] = None
