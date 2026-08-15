from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from .base_instrument import BaseInstrumentExperiment

@dataclass
class XRDExperiment(BaseInstrumentExperiment):
    """
    Domain entity specifically for XRD Spectroscopy.
    Inherits base properties and adds XRD-specific fields.
    """
    def __post_init__(self):
        self.instrument_type = "XRD"
        
    # XRD specific raw data
    raw_two_theta: Optional[List[float]] = None
    raw_intensity: Optional[List[float]] = None
    
    # Processed states
    processed_intensity: Optional[List[float]] = None
    
    # XRD Metadata
    radiation_type: str = "Cu" # Cu, Mo, Co, Fe, Cr
    wavelength_angstrom: Optional[float] = None
    temperature_k: Optional[float] = None
    
    # Scientific Results
    detected_peaks: List[Dict[str, Any]] = field(default_factory=list) # 2theta, hkl
    candidate_phases: List[Dict[str, Any]] = field(default_factory=list)
    confirmed_phase_ids: List[str] = field(default_factory=list)
    cif_files: List[Dict[str, Any]] = field(default_factory=list)
    
    # Rietveld Refinement
    selected_refinement_phases: List[Dict[str, Any]] = field(default_factory=list)
    rietveld_results: Optional[Dict[str, Any]] = None # Includes R_wp, Chi_sq, lattice params
    
    # Metrics
    goodness_of_fit: Optional[float] = None
