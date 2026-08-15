# MatPilot V2 Instrument Specifications

## 1. XRD (X-Ray Diffraction)
- **Purpose**: Identify crystal phases, quantify phase mixtures, and determine lattice parameters.
- **Workflow**: Upload -> Baseline -> Search/Match -> Rietveld -> Report.
- **UI Focus**: Interactive 2D diffractogram (Intensity vs 2-theta), draggable baseline nodes, Miller index overlays on peaks.
- **Scientific Calculations**: Bragg's Law, Scherrer Equation, Rietveld Refinement (Least squares fit).
- **Databases**: Crystallography Open Database (COD), PDF-4.
- **Outputs**: CIF files, Phase fractions (wt%), Lattice constants (a,b,c).

## 2. FTIR (Fourier-Transform Infrared Spectroscopy)
- **Purpose**: Identify molecular functional groups and chemical bonding.
- **Workflow**: Upload -> Smooth -> Peak Find -> Assign Groups -> Library Match.
- **UI Focus**: Reversed X-axis (4000 to 400 cm⁻¹), Transmittance/Absorbance toggle, highlighted "Fingerprint Region".
- **Scientific Calculations**: Beer-Lambert Law, 2nd Derivative peak picking.
- **Databases**: Open Specy, NIST WebBook, SDBS.
- **Outputs**: Functional group assignments, Peak table.

## 3. Raman Spectroscopy
- **Purpose**: Complementary to FTIR, excels in homonuclear bonds and carbon structures.
- **Workflow**: Upload -> Despike -> Fluorescence Baseline -> Deconvolute -> Match.
- **UI Focus**: Cosmic ray removal preview, interactive peak deconvolution (Gaussian fits over raw data).
- **Scientific Calculations**: Lorentzian/Voigt profile fitting.
- **Databases**: RRUFF, Raman Open Database.
- **Outputs**: Raman shift tables, Phase identity (e.g., G/D bands).

## 4. UV-Vis Spectroscopy
- **Purpose**: Determine optical properties and electronic transitions (band gap).
- **Workflow**: Upload -> Kubelka-Munk -> Tauc Plot -> Band Gap calculation.
- **UI Focus**: Side-by-side view of Absorbance spectrum and Tauc Plot. Draggable tangent line for band gap extraction.
- **Scientific Calculations**: Tauc equation: $(h\nu \alpha)^{1/n} = A(h\nu - E_g)$.
- **Databases**: PhotochemCAD.
- **Outputs**: Direct/Indirect Eg values, optical density.
