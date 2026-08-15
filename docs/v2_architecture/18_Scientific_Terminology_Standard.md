# MatPilot V2 Scientific Terminology Standard

## 1. Core Mandate
MatPilot must speak the native language of the instrument. Reusing generic terms across different scientific techniques destroys the illusion of professional, dedicated software and confuses domain experts.

## 2. UI and API Naming Conventions

### A. Generic vs Specific Terminology
- **DO NOT USE**: "Intensity vs X-Axis"
- **USE (XRD)**: "Intensity (a.u.) vs 2θ (°)"
- **USE (FTIR)**: "Transmittance (%) vs Wavenumber (cm⁻¹)"
- **USE (Raman)**: "Intensity (a.u.) vs Raman Shift (cm⁻¹)"
- **USE (UV-Vis)**: "Absorbance vs Wavelength (nm)"

### B. Processing Terminology
- **Baseline Correction**:
  - XRD: "Amorphous Background Stripping"
  - FTIR: "Atmospheric Suppression / Baseline Linearization"
  - Raman: "Fluorescence Background Subtraction"
- **Peak Analysis**:
  - XRD: "Bragg Peak Indexing"
  - FTIR: "Absorption Band Assignment"
  - Raman: "Deconvolution and Peak Fitting"
  - UV-Vis: "Absorption Edge Extrapolation"

## 3. Database Schema Naming
The database columns must reflect the terminology standard to maintain domain driven design.
- `xrd_experiments.two_theta_range`
- `ftir_experiments.wavenumber_range`
- `uvvis_experiments.wavelength_range`

## 4. AI Prompt Formatting
Every AI prompt must inject a strict glossary constraint. 
**Example (Raman AI)**: *"You are a Raman spectroscopy expert. You must refer to spectral features as 'Raman shifts' or 'bands', never as 'Bragg peaks' or 'absorbance valleys'. Discuss phenomena in terms of 'polarizability' and 'phonons', not 'dipole moments'."*

## 5. Validation Rules
The UI component library must accept a `TerminologyContext` prop. A generic `ChartAxisLabel` component will automatically render "Wavenumber (cm⁻¹)" if the context is `FTIR`, preventing accidental cross-contamination of terms by developers.
