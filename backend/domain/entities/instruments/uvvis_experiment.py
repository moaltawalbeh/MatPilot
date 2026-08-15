from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from .base_instrument import BaseInstrumentExperiment

@dataclass
class UVVisExperiment(BaseInstrumentExperiment):
    """
    Domain entity specifically for UV-Vis Spectroscopy.
    Inherits base properties and adds UV-Vis-specific fields.
    """
    def __post_init__(self):
        self.instrument_type = "UVVIS"
        
    # UV-Vis specific raw data
    raw_wavelength_nm: Optional[List[float]] = None
    raw_absorbance: Optional[List[float]] = None
    
    # Processed states
    processed_absorbance: Optional[List[float]] = None
    
    # Tauc Plot specific
    tauc_energy_ev: Optional[List[float]] = None
    tauc_quantity: Optional[List[float]] = None
    
    # UV-Vis Metadata
    measurement_mode: str = "Transmission" # Transmission, Diffuse Reflectance
    scan_speed: Optional[str] = None
    optical_path_length_cm: Optional[float] = None
    signal_is_absorption_coefficient: bool = False
    
    # Scientific Results
    detected_peaks: List[Dict[str, Any]] = field(default_factory=list) # lambda_max
    band_gap_ev: Optional[float] = None
    band_gap_type: Optional[str] = None # Direct, Indirect
    library_matches: List[Dict[str, Any]] = field(default_factory=list)
    
    # Metrics
    linear_fit_r_squared: Optional[float] = None
