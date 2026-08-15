# MatPilot V2 Scientific Processing Pipelines

Every characterization technique operates via a strictly defined, immutable processing pipeline.

## 1. XRD (X-Ray Diffraction)
1. **Upload**: Raw data ingestion (.raw, .xy, .xrdml).
2. **Validation**: Array shape consistency, non-negative intensities, wavelength confirmation.
3. **Background Correction**: Amorphous halo stripping (polynomial, Sonneveld-Visser).
4. **Noise Reduction**: Optional Savitzky-Golay filtering.
5. **Peak Detection**: Identification of distinct Bragg reflections (2-theta maxima).
6. **Peak Indexing**: Assignment of Miller indices (hkl).
7. **Reference Matching**: RDL Query against COD/PDF-4 based on elemental constraints.
8. **Phase Identification**: Ranking of candidate crystalline phases.
9. **Scientific Computation (Rietveld)**: Least-squares minimization refining lattice parameters, atomic positions, and microstrain.
10. **Scientific Validation**: Rwp, GOF (Goodness of Fit), and physically feasible parameter bounds check.
11. **Scientific AI Interpretation**: Semantic reasoning over phase composition and fit quality.
12. **Experiment Results**: Phase fractions, crystallite size, final profile fit curve.

## 2. FTIR (Fourier-Transform Infrared Spectroscopy)
1. **Upload**: Spectrum ingestion (.spa, .dpt, .csv).
2. **Validation**: Spectral range bounds checking (e.g., 4000-400 cm⁻¹).
3. **Baseline Correction**: Linear/Polynomial or rubber-band stretching.
4. **Normalization**: Min-Max scaling or Max=100% transmittance.
5. **Noise Reduction**: Spectral smoothing.
6. **Peak Detection**: Absorption band identification via 2nd derivative.
7. **Peak Assignment**: Wavenumber centroid extraction.
8. **Functional Group Identification**: Mapping to established organic/inorganic bond ranges.
9. **Vibrational Mode Assignment**: Bending, stretching, scissoring classifications.
10. **Fingerprint Region Interpretation**: Algorithmic mapping below 1500 cm⁻¹.
11. **Reference Matching**: RDL Query against OpenSpecy/SDBS.
12. **Scientific Computation**: Integration of peak areas for relative quantification.
13. **Scientific Validation**: Signal-to-noise ratio check, artifact detection.
14. **Scientific AI Interpretation**: Molecular structure formulation and chemical reasoning.
15. **Experiment Results**: Final annotated spectrum and functional group table.

## 3. Raman Spectroscopy
1. **Upload**: Raman shift ingestion.
2. **Validation**: Laser wavelength matching, range checking.
3. **Cosmic Ray Removal**: Despiking algorithm (Laplacian-based filtering).
4. **Baseline Correction**: High-order polynomial fitting to remove fluorescence.
5. **Noise Filtering**: Signal smoothing.
6. **Peak Detection**: Local maxima identification.
7. **Peak Fitting**: Deconvolution via pseudo-Voigt or Lorentzian profiles for overlapping bands.
8. **Raman Shift Assignment**: Wavenumber centroid extraction.
9. **Material Identification**: Mapping specific band combinations (e.g., G/D bands).
10. **Phase Identification**: Distinguishing polymorphs based on shift variance.
11. **Reference Database Matching**: RDL Query against RRUFF/ROD.
12. **Scientific Computation**: FWHM extraction, peak area ratios (e.g., ID/IG ratio).
13. **Scientific Validation**: Fit residual analysis.
14. **Scientific AI Interpretation**: Crystal symmetry and stress/strain reasoning.
15. **Experiment Results**: Deconvoluted spectrum, shift assignments.

## 4. UV-Vis Spectroscopy
1. **Upload**: Absorbance/Transmittance/Reflectance array ingestion.
2. **Validation**: Photometric range limits checking.
3. **Baseline Correction**: Subtractive dual-beam normalization.
4. **Absorbance/Reflectance Spectrum**: Standard plotting.
5. **Kubelka-Munk Transformation**: Conversion to F(R) for powder samples.
6. **Scientific Computation (Tauc Plot)**: Formulation of (hν * α)^(1/n) vs hν.
7. **Direct Band Gap**: Linear extrapolation at absorption edge (n=1/2).
8. **Indirect Band Gap**: Linear extrapolation at absorption edge (n=2).
9. **Optical Transition Analysis**: Determination of allowed/forbidden transition types.
10. **Absorption Edge Detection**: Algorithmic onset identification.
11. **Peak Interpretation**: Chromophore/Plasmon resonance mapping.
12. **Scientific Validation**: Extrapolation R-squared bounds checking.
13. **Scientific AI Interpretation**: Optoelectronic property reasoning.
14. **Experiment Results**: Band gap values, Tauc plots.

## 5. Future Pipelines (High-Level)
- **SEM**: Upload -> Validation -> Calibration -> Contrast Enhance -> Thresholding -> Watershed Grain Size -> Scientific Computation (Morphometrics) -> Validation -> AI Interpretation -> Results.
- **XPS**: Upload -> Validation -> Shirley Background -> Peak Deconvolution -> Spin-Orbit Splitting Check -> Chemical State Quantification -> Validation -> AI Interpretation -> Results.
- **TGA**: Upload -> Validation -> 1st Derivative (DTG) -> Mass Loss Step Identification -> Scientific Computation (Enthalpy/Kinetics) -> Validation -> AI Interpretation -> Results.
- **BET**: Upload -> Isotherm Validation -> BET Equation Fit -> Monolayer Capacity -> BJH Pore Size Distribution -> Validation -> AI Interpretation -> Results.
