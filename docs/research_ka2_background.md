# Kα2 Stripping (Rachinger Deconvolution) & Powder XRD Background Subtraction — Literature Validation Report

**Scope:** Research-only literature review for the MatPilot XRD data-processing pipeline.
**Status:** No production code was written or modified. All algorithmic constants and equations below are validated against peer-reviewed sources cited in the reference list.
**Date:** August 2026

---

## 0. Executive summary

| Task | Scientifically validated recommendation |
|---|---|
| Kα2 stripping | Rachinger recursion (1948), sweeping from **low to high 2θ**, operating on the *already-stripped* (α1-only) profile, with **angle-dependent doublet separation** Δ(2θ) and **linear interpolation** of the sub-step offset. |
| Preconditions for stripping | **Background subtracted first** and **data smoothed first** (both are required for stability; Rachinger fails on non-negligible background and amplifies noise). |
| Alternative stripping | For noise-robust or automated use: penalized likelihood + composite-link model (de Rooi et al., 2014) jointly smooths and strips; or Ladell–Zagofsky–Pearlman Fourier method (1975) if the true α1/α2 shape relationship is known. |
| Background subtraction | SNIP (Ryan et al., 1988) or asymmetric least squares (Eilers & Boelens, 2005) for model-free automatic use; Chebyshev polynomial (GSAS-II default `chebyschev-1`) for Rietveld-modeled backgrounds. |
| Ratios & wavelengths | Use r = Iα2/Iα1 = 0.50 (Rachinger convention) unless a value from Scofield (1974) is preferred; wavelengths from NIST/Deslattes et al. (2003), Table 3. |
| Pipeline order | (1) background subtract → (2) smooth → (3) Kα2 strip → (4) normalize. **For Rietveld refinement, apply none of these — model background + doublet in the fit.** |

---

## 1. The Rachinger (1948) Kα2 stripping method

### 1.1 Primary citation

> W. A. Rachinger, "A correction for the α1α2 doublet in the measurement of widths of X-ray diffraction lines," *J. Sci. Instrum.* **25**(7), 254–255 (1948). DOI: 10.1088/0950-7671/25/7/125.

### 1.2 The model (three assumptions)

The observed profile is modeled as the sum of two identical-shape components separated by the doublet spacing:

```
I_obs(2θ) = I_α1(2θ) + I_α2(2θ)          with   I_α2(2θ) = r · I_α1[2θ − Δ(2θ)]
```

with (de Rooi et al., 2014; HandWiki "Rachinger correction"):

1. **Identical peak shape** for Kα1 and Kα2.
2. **Fixed intensity ratio** r = Iα2/Iα1 = 0.5 (Kα2 is half the intensity of Kα1; statistical degeneracy of the L2:L3 subshells gives 2:1 in favor of Kα1).
3. **Known angular separation** Δ(2θ) as a function of angle, obtained from Bragg's law (see §1.3).

### 1.3 Doublet separation (exact equation)

From Bragg's law `2d·sinθ = nλ`, differentiating gives Δλ/λ = Δθ·cotθ, i.e.:

```
Δ(2θ) = 2·tan(θ) · (Δλ / λ̄)          with  θ = 2θ/2,   λ̄ = (λα1 + λα2)/2,   Δλ = λα2 − λα1
```

This is the "differentiation of Bragg's law" form. **Important refinement:** Delhez & Mittemeijer (1975, "An improved α2 elimination," *J. Appl. Cryst.* 8, 612) showed that using one constant separation per profile is inadequate when peaks are broad; the separation must be **re-evaluated angle-by-angle within a profile**. They give two improved formulations, one of which is **constant on a sin θ scale**. This is the recommended implementation (see §1.6).

### 1.4 The recursion (exact algorithm)

Substituting the model into itself and solving for the pure α1 component:

```
I_α1(2θ) = I_obs(2θ) − r · I_α1[2θ − Δ(2θ)]           (r = 0.5)
```

Key algorithmic facts, all verified:

- **Sweep direction:** the recursion consumes the already-solved value at the *lower* angle `2θ − Δ(2θ)`, so it must be executed from **low 2θ toward high 2θ** (increasing angle), starting on the first rising edge where no correction is required (Wikipedia/HandWiki: "one starts on a rising edge of a peak… at the point θ+Δθ the true intensity I1 is computed as I1(θ+Δθ) = I(θ+Δθ) − I′(θ)"). Note: the commonly heard phrase "high to low angle" is incorrect for this recursion.
- **Stripped vs. original data:** the recursion is *causal* — the α2 estimate at the current point uses the **already-corrected (stripped) α1 value** at `2θ − Δ(2θ)`, **not** the original observed value. This is the defining recursive property of the Rachinger method (Wikipedia/HandWiki; XRDUG/MTU training notes §Kα2 stripping).
- **Interpolation vs. integer index shifting:** because Δ(2θ) is generally not an integer multiple of the step size, `I_α1[2θ − Δ]` must be **interpolated** (linear interpolation between the two neighboring already-corrected channels is the standard practice). Naive integer-index shifting (rounding Δ to the nearest channel) introduces systematic ripple/error. Gangulee (1970, *J. Appl. Cryst.* 3, 272) notes the classical Rachinger method assumes data on a fixed grid and distributes error unevenly; his Fourier variant avoids this.

### 1.5 One-pass variant (non-recursive)

Some implementations subtract `r·I_obs(2θ − Δ)` instead of the stripped value. This is a *non-recursive* first-order approximation and is **less accurate**; the recursive (stripped-data) form is the method as Rachinger defined it and is what gives the "deconvolution" quality. (Reported in the XRDUG/MTU material as the practical equation `I(2θ) = Iα1(2θ) + ½·Iα1[2θ + Δ(2θ)]` summed over intervals; the corrected recursion is used in production implementations.)

### 1.6 Implementation recommendation — Kα2 stripping algorithm

1. Input must already be **background-subtracted** and **smoothed** (see §2 and §5).
2. Sweep `i` from the first channel at low 2θ to high 2θ.
3. For each channel `2θ_i`, compute `Δ(2θ_i) = 2·tan(θ_i)·(Δλ/λ̄)` per-channel (Delhez–Mittemeijer refinement), or the constant-on-sinθ formulation.
4. Locate `2θ_i − Δ(2θ_i)` in the *output* array; if it falls between channels, **linearly interpolate** the already-stripped output values.
5. Set `I_α1(2θ_i) = I_obs(2θ_i) − 0.5 · I_α1(2θ_i − Δ)`.
6. Clamp negative results to zero **only as a final display/safety operation, not inside the recursion** (clamping inside the recursion biases the deconvolution).
7. If the profile is used for **line-width / Fourier analysis**, prefer the Delhez–Mittemeijer (1975) improved separation and their documented error budget; or use the Ladell et al. (1975) Fourier method, which uses the *actual* α1↔α2 shape relationship and distributes error evenly (implemented, e.g., in Match!).

---

## 2. Known failure modes of Rachinger stripping & accepted remedies

### 2.1 Documented failure modes

| Failure mode | Mechanism | Sources |
|---|---|---|
| **Noise amplification** | The recursion is a causal IIR-like difference filter: noise in the corrected region propagates forward and accumulates; channel-to-channel noise is amplified as the sweep proceeds. | de Rooi et al. (2014) compare Rachinger vs. their smoother and note distortion/local ripples; Delhez & Mittemeijer (1975, "An analysis of errors in the Fourier coefficients of the α1 line profile," *J. Appl. Cryst.* 8, 609) show the mean-square error caused by counting statistics is a periodic function of harmonic number. |
| **Negative intensities** | When counts are low/noisy, `I_obs − r·I_corr` goes negative; also produced by ringing near sharp peaks. | Wikipedia/HandWiki; general deconvolution literature (positivity constraint remedies). |
| **Oversubtraction / overcompensation** | Errors pile up toward high 2θ ("piling up of overcompensation"); explicitly reported for the Ladell implementation used in Match! (Match! docs: overcompensation error in the high-angle area). | Crystal Impact Match! documentation (Ladell et al., 1975 method). |
| **Background-induced spurious correction** | The correction loses validity for non-negligible background because the background itself gets scaled and subtracted, creating artificial features. | Wikipedia/HandWiki; de Rooi et al. (2014). |
| **Assumption violation: α1 ≠ α2 shape** | Kα2 is slightly broader than Kα1 (different natural lifetime of the 2p1/2 vs 2p3/2 states); identical-shape assumption is approximate, causing small form/intensity deviations. | Wikipedia/HandWiki; Hölzer et al. (1997); Chantler et al. (2013) Voigt-profile study (Kα2 linewidth > Kα1 linewidth). |
| **Wrong ratio/λ constants** | Errors in r or Δ(2θ) primarily corrupt the low-order Fourier coefficients (i.e., integrated intensity / profile area). | Delhez & Mittemeijer (1975) error analysis. |

### 2.2 Accepted remedies

1. **Smooth before stripping** — reduces the high-frequency noise that the recursion amplifies. Savitzky–Golay (Savitzky & Golay, 1964) is the classical choice; Poisson-aware penalized-likelihood smoothing is statistically better for count data (de Rooi et al., 2014).
2. **Alternating/periodic smoothing during iteration** — re-apply a light smoothing pass on the partially stripped profile between recursion passes to suppress propagated noise (standard practice in stripping implementations; equivalent in spirit to the residual-smoothing / intermediate-regularization used across iterative-deconvolution literature; see Lemeshewsky 1994 for the general iterative-restoration treatment with prefiltering, positive constraint, and limited iterations).
3. **Subtract background before stripping** — eliminates the dominant cause of oversubtraction (§2.1, background row).
4. **Use the angle-dependent doublet separation** (Delhez & Mittemeijer, 1975) instead of a single constant.
5. **Use physically correct r and λ** — see §3 for the constants; a monochromator or detector energy window can alter the effective r and leave high-angle artifacts (MTU XRDUG notes).
6. **Model instead of strip** — for Rietveld/profile refinement, do not preprocess: model the doublet via the emission profile and the background via polynomials (de Rooi et al., 2014; GSAS-II, FullProf, BGMN practice). The PCLM method of de Rooi et al. (2014) is the modern automated alternative that avoids most Rachinger artifacts ("better results with less local distortion" vs. Savitzky–Golay + Rachinger).

---

## 3. Kα2/Kα1 wavelength and intensity ratios for Cu, Co, Mo, Fe, Cr

### 3.1 Wavelengths (Å)

Primary source: NIST X-ray Transition Energies database / Deslattes et al. (2003). Secondary (legacy, used in older software): Bearden (1967).

| Target | λ(Kα1) / Å | λ(Kα2) / Å | Δλ = λ2−λ1 / Å | λ̄ / Å | Δλ/λ̄ |
|---|---|---|---|---|---|
| **Cr** (Z=24) | 2.289760 (2.289700¹) | 2.293606 (2.293606¹) | 0.003846 | 2.291683 | 1.678×10⁻³ |
| **Fe** (Z=26) | 1.936042 (1.935970¹) | 1.939980 (1.939980¹) | 0.003938 | 1.938011 | 2.032×10⁻³ |
| **Co** (Z=27) | 1.788965 (1.788920¹) | 1.792850 (1.792850¹) | 0.003885 | 1.790908 | 2.169×10⁻³ |
| **Cu** (Z=29) | 1.540598 (1.540562¹) | 1.544426 (1.544390¹) | 0.003828 | 1.542512 | 2.482×10⁻³ |
| **Mo** (Z=42) | 0.709319 (0.709300¹) | 0.713609 (0.713590¹) | 0.004290 | 0.711464 | 6.030×10⁻³ |

¹ Bearden (1967) values, widely embedded in legacy XRD software (e.g., monochromator tables per *International Tables for Crystallography*, Vol. C). The differences vs. NIST are ~1–5×10⁻⁵ Å and are negligible for stripping purposes (<0.01% in Δ(2θ)). Cu Kα1/Kα2 are often quoted rounded as **1.5406 / 1.5444 Å** (FullProf tutorial uses λ2 = 1.5444; the `alkahest` R package default is `wave = c(1.5406, 1.54443)`).

### 3.2 Intensity ratio r = I(Kα2)/I(Kα1)

- **Rachinger convention (use for stripping):** **r = 0.50** (fixed, angle-independent). This is the value assumed in the Rachinger recursion, in FullProf's profile model (I2/I1 = 0.5), and in de Rooi et al.'s PCLM (τ = 0.5).
- **Theory:** Scofield (1974) relativistic Hartree–Slater radiative-rate ratios, which rise gently with Z: **Cr ≈ 0.495, Fe ≈ 0.496, Co ≈ 0.497, Cu ≈ 0.497, Mo ≈ 0.524**. (Values are read from Scofield's Table 1 and the compilation of Hamidani et al. 2026; the exact trailing digits vary slightly with compilation.)
- **Experiment:** high-accuracy measurements agree with theory within ~1–2% for the 3d metals (McCrary et al., 1970: within ~2%; Hölzer et al., 1997 and Deutsch et al., 2017 for Cu: integrated-intensity ratio ≈ 0.51–0.52, peak-height ratio ≈ 0.51).

**Implementation note:** for Cu/Fe/Co/Cr the error introduced by fixing r = 0.50 instead of the Scofield value is <1% and is well within the method's own noise budget; for Mo the difference is ~5% and the Scofield value r = 0.524 is worth using if Mo data are stripped. Correct r and Δ(2θ) values are critical because errors in them corrupt the low-order Fourier coefficients of the stripped profile (Delhez & Mittemeijer, 1975).

---

## 4. Background subtraction methods for powder XRD

### 4.1 SNIP — Statistics-sensitive Non-linear Iterative Peak-clipping

> C. G. Ryan, E. Clayton, W. L. Griffin, S. H. Sie, D. R. Cousens, "SNIP, a statistics-sensitive background treatment for the quantitative analysis of PIXE spectra in geoscience applications," *Nucl. Instrum. Methods Phys. Res. B* **34**(3), 396–402 (1988). DOI: 10.1016/0168-583X(88)90063-8.
> Generalization/extensions: M. Morháč et al., "Background elimination methods for multidimensional coincidence γ-ray spectra," *Nucl. Instrum. Methods Phys. Res. A* **401**, 113 (1997); and "Peak clipping algorithms for background estimation in spectroscopic data," *Appl. Spectrosc.* **62**, 91–106 (2008).

**Algorithm (as implemented in Mantid `ClipPeaks`, ROOT `TSpectrum`, pyMCA, etc.):**

1. Optional LLS transform (log-log-sqrt) to boost weak peaks and compress dynamic range:
   ```
   v(i) = log( log( sqrt( y(i) + 1 ) + 1 ) + 1 )
   ```
2. Iterative clipping with window radius p = 1 … m:
   ```
   v_p(i) = min{ v_{p−1}(i),  ½[ v_{p−1}(i+p) + v_{p−1}(i−p) ] }
   ```
3. Inverse transform to recover the background estimate, then subtract.

**Parameter:** choose m such that `2m+1` ≈ the width of the **widest feature to preserve** (broadest amorphous hump). Too large m leaves background residue under peaks; too small m digs the baseline into peak flanks (Morháč 2008 discussion). Increasing vs. decreasing clipping-window order gives different behavior; both are used.

**Properties:** statistics-sensitive, model-free, handles amorphous humps well, no built-in convergence criterion (practical stopping rule: window reaches ½ the widest preserved feature; validation by peak-area invariance, CAEN 2017).

### 4.2 Rolling ball / morphological (top-hat)

> S. R. Sternberg, "Biomedical image processing," *Computer* **16**(1), 22–34 (1983). DOI: 10.1109/MC.1983.1654163. Implemented in ImageJ (Process → Subtract Background) and scikit-image `restoration.rolling_ball`.

- Treats the pattern as a surface and estimates background as the envelope of a rolling sphere/disk; equivalent to a gray-scale **morphological opening** (top-hat).
- **1-D usage for XRD:** a 1-D disk/ball kernel with radius ≥ the width of the largest peak to preserve; background = opening of the profile; subtract.
- Strengths: robust, minimal parameters (radius, kernel shape), handles curved backgrounds. Weaknesses: radius is scale-sensitive; unsuitable when diffraction features are broad/amorphous and inseparable from background (Ladisa, 2026, for 2-D XRD; the method's validated agreement with ImageJ is good when background fraction is large).

### 4.3 Iterative polynomial / asymmetric least squares (ALS)

> P. H. C. Eilers & H. F. M. Boelens, "Baseline correction with asymmetric least squares smoothing," Leiden University Medical Centre report (2005). (Unpublished report; the de-facto standard citation, and basis of the `baseline.als` implementation in R and `pybaselines` in Python.)
> Adaptive variant: Z.-M. Zhang, S. Chen, Y.-Z. Liang, "Baseline correction using adaptive iteratively reweighted penalized least squares (airPLS)," *Analyst* **135**, 1138–1146 (2010).

Minimize the asymmetric penalized least-squares criterion over baseline vector **z**:

```
min_z   Σ_i  w_i (y_i − z_i)²  +  λ Σ_i (Δ² z_i)²
w_i = p        if y_i > z_i        (point above baseline ⇒ part of peak ⇒ low weight)
w_i = 1 − p    if y_i < z_i        (below baseline ⇒ must be tracked ⇒ high weight)
```

Iterate ~10× re-solving the sparse linear system `(W + λ DᵀD) z = W y` with reweighting. **Parameters:** asymmetry `p ∈ [0.001, 0.1]` (typically 0.001–0.01 for XRD with sharp peaks), smoothness `λ ∈ 10²–10⁹`. Fast, reproducible, model-free; the penalty λ can be auto-selected by cross-validation with care.

### 4.4 How the Rietveld suites handle background

| Software | Background model | Notes / source |
|---|---|---|
| **GSAS-II** | Default **Chebyshev polynomial of the first kind** (`chebyschev-1`); other options: `chebyschev`, `cosine`, `Q^2 power series`, `Q^-2 power series`, `lin/interp`, `inv interpolate`, `log interpolate`, plus optional **Debye (thermal-diffuse) terms** and **background peaks** (Gaussians for amorphous humps), or a fixed measured-background histogram. | GSAS-II docs & APS tutorials: "Background function should already be set as chebyshev-1"; typically 4–8 coefficients refined; "background models should always be refined in the final stages." Background intensity: `I_bg = Σ_j P_j·T_{j−1}(x)` with `x` mapped to [−1, 1]. |
| **FullProf** | Polynomial (default "6-coefficients polynomial", up to 15 coeffs), **Chebyshev polynomial** (up to 24 terms), cosine Fourier series, linear interpolation between fixed user points, refinable background points, Fourier filtering, or an external `.bac` file. | FullProf manual (Rodríguez-Carvajal). Recommended: orthogonal Chebyshev of order 5–10, often with a `1/(2θ)` term for low-angle air scatter (Dinnebier, in *Modern Diffraction Methods*, Mittemeijer & Welzel, 2013). Caveat: over-parameterized backgrounds absorb Bragg intensity. |
| **Profex / BGMN** | Background is **part of the Rietveld model**: a **measured background scan** (`UNT=…bkgr.xy`, with scale factor `RU`) or a polynomial background; the wavelength distribution (including Kα1/Kα2 and Kα3/Kβ) is carried by instrument-specific `.lam` files and the fundamental-parameters (FPA) profile — the doublet is **never stripped** for Rietveld. | Döbelin & Kleeberg (2015) *J. Appl. Cryst.* 48, 1573; BGMN docs; Profex lessons. |
| **TOPAS** | **Chebyshev polynomial** (typically 5th order) **+ 1/X background** term for low-angle air scattering; emission profile loaded from `.lam` (e.g., `CuKa5_Berger.lam`) — again the doublet is modeled, not stripped. | TOPAS 5 tutorial, Bruker. |

---

## 5. Recommended processing ORDER in a powder XRD pipeline

### 5.1 What the literature says

- **De Rooi et al. (2014):** smoothing and Kα2 elimination are "often applied before evaluation of the data in software packages as supplied with commercially available diffractometers." **Critical caveat:** "for various programs to obtain a fit to the whole diffraction pattern (e.g. Rietveld analysis or MAUD) it is usually **not appropriate to apply smoothing and/or Kα2 elimination prior to data analysis**."
- The ICDD "raw data" definition explicitly excludes data that were "smoothed, α2 stripped, background subtracted, or subjected to any other process that would cause significant changes in the true experimental data" (ICDD grant application; quoted in Černý, "Powder diffraction data beyond the pattern," 2025 review, PMC12321027) — i.e., pre-processing changes are irreversible and must be reserved for the analysis step, never for archival.
- Commercial pipelines (Match!, DIFFRAC.EVA, HighScore, Jade) apply, in some order: background determination → Kα2 stripping → smoothing → peak search. The physically motivated order below resolves the two hard constraints: (i) **background before stripping** (Rachinger invalid on non-negligible background), and (ii) **smoothing before stripping** (noise amplification).

### 5.2 Recommended pipeline (model-independent use: peak search, qualitative phase ID, indexing, visualization, Scherrer size, crystallinity)

```
Raw scan (archived, never overwritten)
   │  optional: flatfield/calibration correction (at acquisition)
   ▼
(1) BACKGROUND estimation & subtraction         SNIP or ALS; or Chebyshev fit
   │        [required BEFORE stripping — Rachinger corrupts nonzero background]
   ▼
(2) SMOOTHING                                  Savitzky–Golay or Poisson penalized-likelihood
   │        [required BEFORE stripping — recursion amplifies noise]
   ▼
(3) Kα2 STRIPPING                              Rachinger recursion, per-channel Δ(2θ), linear
   │        interpolation, r = 0.50 (or Scofield r); optional light re-smoothing
   ▼
(4) NORMALIZATION & corrections                max- or area-normalization; Lorentz–polarization
   │        correction if quantitative peak intensities are required
   ▼
(5) Peak search / indexing / phase ID
```

### 5.3 Recommended pipeline (Rietveld / whole-pattern refinement)

```
Raw scan  →  model everything in the fit:
   • background: Chebyshev (GSAS-II default; TOPAS Chebyshev+1/X; FullProf Chebyshev/polynomial;
     BGMN measured background or polynomial)
   • Kα1/Kα2 doublet: emission profile / .lam wavelength distribution (GSAS-II, TOPAS, BGMN) or
     λ2 & I2/I1 = 0.5 (FullProf)
   • peak shape: instrument + sample parameters
   (NO smoothing, NO background subtraction, NO stripping on the data)
```

---

## 6. Consolidated implementation recommendations

### (a) Kα2 stripping algorithm
- Implement the **recursive Rachinger method**: sweep `2θ` **low → high**; at each channel compute the angle-dependent separation `Δ(2θ) = 2·tanθ·(Δλ/λ̄)` (Delhez–Mittemeijer refinement); fetch the **already-stripped** value at `2θ − Δ` via **linear interpolation**; subtract `r × value`; use `r = 0.50`.
- Preconditions: **background-subtracted and smoothed** input.
- Do not clamp inside the recursion. Guard against negative-output by surface-level clipping only after the sweep.
- Provide a **Ladell-style Fourier option** (actual α1/α2 shape, even error distribution) and/or the **de Rooi PCLM** option as noise-robust alternatives; warn if overcompensation accumulates at high angle (as Match! does).
- Expose the target (λ1, λ2, r) as tunable constants (Table 3).

### (b) Background subtraction
- Default: **SNIP** with clipping window `m` chosen so `2m+1` ≈ width of the broadest amorphous hump (LLS transform + increasing-window pass), or **ALS** (p ≈ 0.001–0.01, λ ≈ 10⁴–10⁷, ~10 iterations).
- For **Rietveld-modeled** backgrounds: **Chebyshev** (GSAS-II `chebyschev-1`, 4–8 terms; TOPAS Chebyshev + 1/X; FullProf Chebyshev 5–10 terms), with optional 1/(2θ) low-angle term and Gaussian background peaks for amorphous humps. Refine background in the final refinement stages only (avoid over-parameterization / background absorbing Bragg intensity).

### (c) Pipeline ordering
- Model-independent analysis: **background → smooth → Kα2 strip → normalize → peak search** (§5.2).
- Rietveld: **no pre-processing**; model background + doublet (§5.3).
- Never overwrite the archived raw scan; pre-processing is irreversible.

### (d) Wavelength / intensity-ratio constants
- Use Table 3 values from NIST/Deslattes et al. (2003) (Cu 1.540598/1.544426 Å, Co 1.788965/1.792850 Å, Mo 0.709319/0.713609 Å, Fe 1.936042/1.939980 Å, Cr 2.289760/2.293606 Å).
- `r = Iα2/Iα1 = 0.50` (Rachinger/FullProf convention); for Mo prefer Scofield r ≈ 0.524. Optional Scofield values: Cr 0.495, Fe 0.496, Co 0.497, Cu 0.497.
- Document that errors in r and Δλ corrupt low-order Fourier coefficients (Delhez & Mittemeijer, 1975), so constants should not be silently changed.

---

## 7. References

1. **Rachinger, W. A.** (1948). A correction for the α1α2 doublet in the measurement of widths of X-ray diffraction lines. *J. Sci. Instrum.* **25**(7), 254–255. DOI: 10.1088/0950-7671/25/7/125.
2. **Klug, H. P., & Alexander, L. E.** (1974). *X-Ray Diffraction Procedures for Polycrystalline and Amorphous Materials*, 2nd ed. Wiley (Section 9-1.1 "The Rachinger Correction").
3. **Ladell, J., Zagofsky, A., & Pearlman, S.** (1975). CuKα2 elimination algorithm. *J. Appl. Cryst.* **8**(5), 499–506. DOI: 10.1107/S0021889875011132.
4. **Delhez, R., & Mittemeijer, E. J.** (1975a). An improved α2 elimination. *J. Appl. Cryst.* **8**(6), 612–618. DOI: 10.1107/S0021889875011466.
5. **Delhez, R., & Mittemeijer, E. J.** (1975b). An analysis of errors in the Fourier coefficients of the α1 line profile. *J. Appl. Cryst.* **8**(6), 609–611. DOI: 10.1107/S0021889875011478.
6. **Gangulee, A.** (1970). Separation of the α1–α2 doublet in X-ray diffraction profiles. *J. Appl. Cryst.* **3**, 272–277. DOI: 10.1107/S0021889870006179.
7. **Platbrood, G.** (1983). Kα2 elimination algorithm for Cu, Co and Cr radiations. *J. Appl. Cryst.* **16**, 204–208. DOI: 10.1107/S0021889883009905.
8. **de Rooi, J. J., van der Pers, N. M., Hendrikx, R. W. A., Delhez, R., Böttger, A. J., & Eilers, P. H. C.** (2014). Smoothing of X-ray diffraction data and Kα2 elimination using penalized likelihood and the composite link model. *J. Appl. Cryst.* **47**, 852–860. DOI: 10.1107/S1600576714005809.
9. **Ryan, C. G., Clayton, E., Griffin, W. L., Sie, S. H., & Cousens, D. R.** (1988). SNIP, a statistics-sensitive background treatment for the quantitative analysis of PIXE spectra in geoscience applications. *Nucl. Instrum. Methods Phys. Res. B* **34**(3), 396–402. DOI: 10.1016/0168-583X(88)90063-8.
10. **Morháč, M., Kliman, J., Matoušek, V., Veselský, M., & Turzo, I.** (1997). Background elimination methods for multidimensional coincidence γ-ray spectra. *Nucl. Instrum. Methods Phys. Res. A* **401**, 113–168. DOI: 10.1016/S0168-9002(97)01023-4.
11. **Morháč, M.** (2008). Peak clipping algorithms for background estimation in spectroscopic data. *Appl. Spectrosc.* **62**(1), 91–106. DOI: 10.1366/000370208783412762.
12. **Sternberg, S. R.** (1983). Biomedical image processing. *Computer* **16**(1), 22–34. DOI: 10.1109/MC.1983.1654163.
13. **Eilers, P. H. C., & Boelens, H. F. M.** (2005). Baseline correction with asymmetric least squares smoothing. Leiden University Medical Centre report.
14. **Zhang, Z.-M., Chen, S., & Liang, Y.-Z.** (2010). Baseline correction using adaptive iteratively reweighted penalized least squares. *Analyst* **135**(5), 1138–1146. DOI: 10.1039/b922045c.
15. **Savitzky, A., & Golay, M. J. E.** (1964). Smoothing and differentiation of data by simplified least squares procedures. *Anal. Chem.* **36**(8), 1627–1639. DOI: 10.1021/ac60214a047.
16. **Deslattes, R. D., Kessler, E. G., Jr., Indelicato, P., de Billy, L., Lindroth, E., Anton, J., Coursey, J. S., Schwab, D. J., Chang, J., Sukumar, R., Olsen, K., & Dragoset, R. A.** (2003). X-ray transition energies: new approach to a comprehensive evaluation. *Rev. Mod. Phys.* **75**, 35–99. DOI: 10.1103/RevModPhys.75.35 (NIST X-ray Transition Energies database, physics.nist.gov/XrayTrans).
17. **Bearden, J. A.** (1967). X-ray wavelengths and X-ray atomic energy levels. *Rev. Mod. Phys.* **39**, 78–124. DOI: 10.1103/RevModPhys.39.78 (NSRDS-NBS 14).
18. **Scofield, J. H.** (1974). Relativistic Hartree–Slater values for K and L x-ray emission rates. *At. Data Nucl. Data Tables* **14**(2), 121–137. DOI: 10.1016/S0092-640X(74)80019-7.
19. **McCrary, J. H., Van Atten, L. V., Placious, R., & Darden, J. B.** (1970). Kα2/Kα1 transition probabilities in elements with Z < 50. *Phys. Rev. A* **2**, 1121. DOI: 10.1103/PhysRevA.2.1121.
20. **Hölzer, G., Fritsch, M., Deutsch, M., Härtwig, J., & Förster, E.** (1997). Kα1,2 and Kβ1,3 x-ray emission lines of the 3d transition metals. *Phys. Rev. A* **56**, 4554. DOI: 10.1103/PhysRevA.56.4554.
21. **Deutsch, M., et al.** (2017). High-precision measurement of the x-ray Cu Kα spectrum. *J. Phys. B: At. Mol. Opt. Phys.* **50**, 115004. DOI: 10.1088/1361-6455/aa6c4a.
22. **Hamidani, A., Kahoul, A., Zidi, A., Marques, J. P., Daoudi, S., Parente, F., et al.** (2026). K-shell X-ray intensity ratios: compilation of experimental data, semi-empirical modeling, and MCDF calculations for 13 ≤ Z ≤ 99. *At. Data Nucl. Data Tables* **158**, 101795. DOI: 10.1016/j.adt.2026.101795.
23. **Toby, B. H., & von Dreele, R. B.** (2013). GSAS-II: the genesis of a modern open-source all-purpose crystallography software package. *J. Appl. Cryst.* **46**, 544–549. DOI: 10.1107/S0021889813003531. (Plus GSAS-II documentation and APS GSAS-II tutorials: background functions `chebyschev-1`, etc.)
24. **Rodríguez-Carvajal, J.** (2001). *FullProf manual* (ILL, Grenoble); background options (polynomial, Chebyshev, cosine Fourier, fixed/refinable points, Fourier filtering, `.bac` files).
25. **Dinnebier, R. E.** (2013). Rietveld refinement — chapter in *Modern Diffraction Methods* (E. J. Mittemeijer & U. Welzel, eds.), Wiley-VCH (recommends orthogonal Chebyshev polynomials of order 5–10 with a 1/(2θ) term).
26. **Döbelin, N., & Kleeberg, R.** (2015). Profex: a graphical user interface for the Rietveld refinement program BGMN. *J. Appl. Cryst.* **48**, 1573–1580. DOI: 10.1107/S1600576715014685.
27. **Bergmann, J., Friedel, P., & Kleeberg, R.** (1998). BGMN — a new fundamental parameters based Rietveld program for laboratory X-ray sources, its use in quantitative analysis and structure investigations. *CPD Newsletter* **20**, 5–8.
28. **Sonneveld, E. J., & Visser, J. W.** (1975). Automatic determination of background in X-ray powder diffraction patterns. *J. Appl. Cryst.* **8**, 1–7. DOI: 10.1107/S002188987500951X.
29. **Ladisa, M.** (2026). Automated procedure for centre localization, noise removal, and background suppression in two-dimensional X-ray diffraction patterns. *Appl. Sci.* **16**(4), 1776 (rolling-ball background for 2-D XRD; Sternberg method validation).
30. **Černý, R.** (2025). Powder diffraction data beyond the pattern: a practical review. *J. Appl. Cryst.* (PMC12321027) — ICDD "raw data" definition (not smoothed, α2 stripped, background subtracted).
31. **Lemeshewsky, G. P.** (1994). Examples of constrained iterative restoration of SPOT panchromatic images, with prefiltering for noise reduction. USGS Open-File Report 94-251 (general iterative-restoration remedies: prefiltering, positive constraint, limited iterations).

---

## 8. Caveats & open items

- The trailing digits of the Scofield (1974) ratio values differ slightly between compilations; the values quoted here (Cr 0.495, Fe 0.496, Co 0.497, Cu 0.497, Mo 0.524) are rounded and should be cross-checked against Scofield's Table 1 before being hard-coded.
- Eilers & Boelens (2005) is an unpublished university report; the method is nonetheless the standard citation in the spectroscopy literature and is implemented in R (`baseline` package) and Python (`pybaselines`).
- Rachinger stripping assumes a well-resolved single-phase profile; for heavily overlapped or severely broadened profiles, use the de Rooi PCLM or model the doublet directly in refinement.
