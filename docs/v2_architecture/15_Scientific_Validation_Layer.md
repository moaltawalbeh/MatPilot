# MatPilot V2 Scientific Validation Layer

## 1. Architectural Guardrail
The Scientific Validation Layer sits strictly between the Scientific Computation Engine and the AI Scientist. Its sole purpose is to ensure that the AI only ever receives mathematically sound, physically plausible data. The AI must never be allowed to "guess" if a calculation was successful.

## 2. Validation Flow
`Raw Data` -> `Computation Engine` -> **`Validation Layer`** -> `Confidence Metric` -> `AI Scientist`

## 3. Validation Responsibilities
- **Result Consistency**: Do the numbers make physical sense? (e.g., A crystallite size cannot be negative).
- **Processing Quality**: Was the baseline correction successful, or did it introduce artifacts?
- **Outlier Detection**: Are there massive spikes indicating a cosmic ray was missed?
- **Numerical Stability**: Did the Rietveld least-squares minimization converge, or did it hit the iteration limit?
- **Uncertainty Estimation**: Attaching explicit error margins (±) to computed values.

## 4. Instrument-Specific Strategies

### XRD Validation
- **Metrics**: `R_wp` (Weighted profile R-factor), `R_exp` (Expected R-factor), `Chi-squared` (Goodness of Fit).
- **Rule**: If `Chi-squared > 10`, the layer flags the fit as "Divergent/Unstable" and passes a `LOW_CONFIDENCE` flag to the AI.
- **Physical Bounds**: Lattice parameters must be > 0. Phase fractions must sum to ~100%.

### FTIR Validation
- **Metrics**: Signal-to-Noise Ratio (SNR), Baseline drift detection.
- **Rule**: If Transmittance exceeds 100% or drops below 0% after correction, flag as "Normalization Error".
- **Rule**: If a peak is detected but its FWHM (Full Width at Half Maximum) is narrower than the instrument resolution, flag as "Possible Artifact / Noise".

### Raman Validation
- **Metrics**: Residual fluorescence check, Peak fitting $R^2$.
- **Rule**: If the deconvoluted peak areas sum to >110% of the raw envelope area, flag as "Over-fitted".

### UV-Vis Validation
- **Metrics**: Tauc plot linearity $R^2$.
- **Rule**: If the linear extrapolation for the band gap has $R^2 < 0.95$, flag as "Ambiguous Absorption Edge". The AI will be instructed to express high uncertainty regarding the band gap value.

## 5. Interface to AI
The Validation Layer outputs a strictly formatted JSON object appended to the computational results:
```json
{
  "validation_status": "PASS",
  "confidence_score": 0.92,
  "flags": [],
  "uncertainty_metrics": {
    "R_wp": 4.5,
    "Chi_sq": 1.2
  }
}
```
The AI Scientist is hard-prompted to begin its interpretation by acknowledging this validation block.
