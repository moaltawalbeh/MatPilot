from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from .base_instrument import BaseInstrumentExperiment

@dataclass
class RamanExperiment(BaseInstrumentExperiment):
    """
    Domain entity specifically for Raman Spectroscopy.
    Inherits base properties and adds Raman-specific fields.
    """
    def __post_init__(self):
        self.instrument_type = "RAMAN"
        
    # Raman specific raw data
    raw_raman_shift: Optional[List[float]] = None # Raman Shift in cm-1
    raw_intensity: Optional[List[float]] = None
    
    # Processed states
    processed_intensity: Optional[List[float]] = None
    
    # Raman Metadata
    laser_wavelength_nm: Optional[float] = None
    laser_power_mw: Optional[float] = None
    exposure_time_s: Optional[float] = None
    accumulations: Optional[int] = None
    
    # Scientific Results
    detected_peaks: List[Dict[str, Any]] = field(default_factory=list) # Shift, Intensity, FWHM
    phonons: List[Dict[str, Any]] = field(default_factory=list) # Mapped from peaks
    library_matches: List[Dict[str, Any]] = field(default_factory=list) # From RRUFF
    
    # Metrics
    fluorescence_background_level: Optional[float] = None
