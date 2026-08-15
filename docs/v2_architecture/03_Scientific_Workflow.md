# MatPilot V2 Scientific Workflows

This document defines the strict, independent scientific workflows for each instrument. The UI and API must guide the user sequentially through these exact steps.

## XRD (X-Ray Diffraction)
1. **Upload**: Raw data (.raw, .xy, .xrdml).
2. **Data validation**: Checking 2-theta range and intensity.
3. **Peak detection**: Finding maxima.
4. **Background correction**: Polynomial or amorphous halo stripping.
5. **Peak indexing**: Assigning hkl Miller indices.
6. **Phase identification**: Matching peaks against structural databases (COD, PDF).
7. **Reference matching**: Confirming candidate phases.
8. **Rietveld refinement**: Full-pattern profile fitting to extract lattice parameters, crystallite size, and strain.
9. **Scientific interpretation**: AI reviews fit metrics (Rwp, GOF) and physical feasibility.
10. **Experiment results**: Final crystal structure and quantification tables.

## FTIR (Fourier-Transform Infrared Spectroscopy)
1. **Upload**: Spectrum data (.spa, .csv, .dpt).
2. **Baseline correction**: Linear, polynomial, or rubber-band methods.
3. **Noise removal**: Savitzky-Golay smoothing.
4. **Normalization**: Min-max or standard normal variate (SNV).
5. **Peak detection**: Finding absorption/transmittance bands.
6. **Peak assignment**: Wavenumber mapping.
7. **Functional group identification**: Matching regions (e.g., >3000 cm⁻¹ for OH/NH).
8. **Vibrational mode assignment**: Stretching, bending, scissoring.
9. **Fingerprint region interpretation**: Complex matching below 1500 cm⁻¹.
10. **Reference library matching**: Spectral correlation with databases (Open Specy, SDBS).
11. **Scientific AI interpretation**: Textual analysis of chemical bonding and likely composition.
12. **Experiment results**: Peak table and functional group lists.

## Raman Spectroscopy
1. **Upload**: Spectrum data (.txt, .csv, .spc).
2. **Cosmic ray removal**: Despiking algorithms to remove sharp anomalous cosmic hits.
3. **Baseline correction**: Removing fluorescence background (polynomial fitting).
4. **Noise filtering**: Signal smoothing.
5. **Peak detection**: Identifying Raman shifts.
6. **Peak fitting**: Gaussian/Lorentzian/Voigt deconvolution for overlapping bands.
7. **Raman shift assignment**: Mapping shifts to vibrational modes.
8. **Material identification**: Matching distinct signatures (e.g., G and D bands in carbon).
9. **Phase identification**: Distinguishing polymorphs (e.g., anatase vs. rutile TiO2).
10. **Reference database matching**: Correlation against RRUFF or ROD.
11. **Scientific AI interpretation**: Structural and phase purity reasoning.
12. **Experiment results**: Deconvoluted peak table and material assignments.

## UV-Vis (Ultraviolet-Visible Spectroscopy)
1. **Upload**: Absorbance/Transmittance/Reflectance spectra.
2. **Baseline correction**: Subtractive background normalization.
3. **Absorbance spectrum**: Plot generation.
4. **Reflectance spectrum**: (If applicable via integrating sphere).
5. **Kubelka-Munk transformation**: Converting reflectance to F(R).
6. **Tauc Plot**: (hν * α)^(1/n) vs hν formulation.
7. **Direct Band Gap**: Extrapolating linear region for n=1/2.
8. **Indirect Band Gap**: Extrapolating linear region for n=2.
9. **Optical transition analysis**: Determining allowed vs forbidden transitions.
10. **Absorption edge detection**: Finding onset of absorption.
11. **Peak interpretation**: Identifying plasmonic resonances or specific chromophores.
12. **Scientific AI interpretation**: Correlating band gap with semiconductor properties.
13. **Experiment results**: Band gap values and optical parameters.

## Future Instruments Pipeline
The architecture supports the following future workflows:
- **SEM / TEM**: Image Upload -> Scale Calibration -> Contrast Enhancement -> Grain Size Analysis (Watershed algorithms) -> EDS Mapping overlay -> Morphological AI Interpretation.
- **XPS**: Survey Scan Upload -> High-res Region Upload -> Shirley Background Correction -> Spin-Orbit Splitting Fitting -> Chemical State Quantification -> AI Chemical Environment Analysis.
- **BET**: Isotherm Upload -> BET Equation fitting -> Monolayer capacity calculation -> Pore size distribution (BJH) -> Surface area extraction.
- **DSC / TGA**: Thermogram Upload -> Baseline correction -> Onset/Peak temperature detection -> Enthalpy calculation -> Mass loss quantification -> Thermal stability AI interpretation.
