# Rietveld Refinement Methodology — Research Validation Report

**Purpose:** Validate the accepted scientific methodology and exact equations for Rietveld refinement profile / broadening / preferred-orientation physics and uncertainty reporting, as implemented in the reference programs GSAS-II, FullProf and TOPAS. This document is the authoritative source for correct formula constants and conventions for the MatPilot Rietveld engine.

**Method:** All items below were verified against primary literature and the documentation/manuals of GSAS-II, FullProf and TOPAS (web searches; primary references cited inline). Where programs differ in convention (units, centidegrees vs. degrees), both forms are given with explicit conversion constants.

---

## 1. Pseudo-Voigt profile function, mixing parameter η, and the Caglioti equation

### Validated methodology

The **pseudo-Voigt** `pV(x)` is a *linear combination* (weighted sum) of a Lorentzian `L` and a Gaussian `G` sharing the same total FWHM Γ, with mixing parameter η. It is the most widely used analytical peak-shape approximation of the true Voigt (convolution) profile in X-ray and constant-wavelength neutron Rietveld analysis (IUCr Rietveld guidelines, 1999). It was introduced into Rietveld practice by **Thompson, Cox & Hastings (TCH), 1987**.

**Area-normalized forms** (each component normalized so ∫ = 1, x measured from peak centre, Γ = FWHM):

```
L(x, Γ) = (2/(π·Γ)) · 1/(1 + 4x²/Γ²)                          (normalized Lorentzian)
G(x, Γ) = (2/Γ)·√(ln2/π)·exp(−4·ln2·x²/Γ²)                    (normalized Gaussian)
pV(x)   = η·L(x, Γ) + (1−η)·G(x, Γ)                           (area-normalized; ∫pV dx = 1)
```

- η = 0 → pure Gaussian; η = 1 → pure Lorentzian. η is often written "fraction of Lorentzian".
- Equivalently, with component widths σ (Gaussian) and γ (HWHM Lorentzian): `w_G = 2√(2ln2)·σ`, `w_L = 2γ`.

**Mixing parameter η tied to the component widths — the TCH approximation (not "Finger–Cox–Jephcoat"):**

The question in the brief asks whether η can be tied to the FWHM of the Gaussian/Lorentzian components. **Yes** — this is precisely the **Thompson–Cox–Hastings (1987)** approximation:

```
Γ⁵ = Γ_G⁵ + 2.69269·Γ_G⁴·Γ_L + 2.42843·Γ_G³·Γ_L²
        + 4.45163·Γ_G²·Γ_L³ + 0.07842·Γ_G·Γ_L⁴ + Γ_L⁵
η  = 1.36603·(Γ_L/Γ) − 0.47719·(Γ_L/Γ)² + 0.11116·(Γ_L/Γ)³
```

Here `Γ_G` and `Γ_L` are the FWHM of the Gaussian and Lorentzian components, and Γ is the FWHM of the resulting pseudo-Voigt. This is exactly the form used in GSAS-II (`getgamFW` — "Compute total FWHM from Thompson, Cox & Hastings (1987), J. Appl. Cryst. 20, 79-83"). **Important clarification:** the *Finger–Cox–Jephcoat* function is NOT a mixing-parameter approximation; it is a separate low-angle peak-**asymmetry** correction for axial divergence (Finger, Cox & Jephcoat, 1994), which GSAS-II applies in profile types 3/4.

**Caglioti equation** (Caglioti, Paoletti & Ricci, 1958; the FWHM of the Gaussian component vs. θ):

```
FWHM² = U·tan²θ + V·tanθ + W
```

This is the instrument-resolution formula, adopted by Rietveld (1969). It is used for the Gaussian component; U, V, W are instrument terms (highly correlated; often fixed from a standard such as NIST SRM 660 LaB₆).

**Full TCH angular dependence** (Gaussian and Lorentzian component FWHMs):

```
Γ_G² = U·tan²θ + V·tanθ + W (+ Z/cos²θ)          [GSAS-II/RIETAN-94 add the Z/cos²θ or P·sec²θ term]
Γ_L  = X/cosθ + Y·tanθ (+ Z)
```

- `X` (and `Z`) = size-related (∝ 1/cosθ, Scherrer-like), `Y` = strain-related (∝ tanθ). This is the physical basis that lets size/strain be read directly from refined profile terms.
- **GSAS-II CW convention** (units = centidegrees): `σ² = U·tan²θ + V·tanθ + W` (Gaussian **variance**, centideg²), `FWHM_G = σ·√(8·ln2)`; Lorentzian `γ = X/cosθ + Y·tanθ + Z` (centideg). GSAS-II separates *instrumental* terms (U,V,W,X,Y in Instrument Parameters) from *sample* terms (size, microstrain per phase/histogram).

### Implementation recommendation

(a) **Area-normalized pseudo-Voigt**: implement `pV(x) = η·L(x,Γ) + (1−η)·G(x,Γ)` with the exact normalized L and G given above (x = 2θ − 2θₖ). Compute Γ_G, Γ_L from `Γ_G² = U·tan²θ + V·tanθ + W`, `Γ_L = X/cosθ + Y·tanθ` (angle in radians; if U,V,W are stored in degrees², convert); then Γ and η from the TCH polynomial constants (use the five constants exactly: 2.69269, 2.42843, 4.45163, 0.07842, and 1.0 for the Γ_L⁵ term; η coefficients 1.36603, −0.47719, 0.11116). Clamp η to [0,1]. This reproduces GSAS-II peak shapes.

---

## 2. March–Dollase preferred orientation

### Validated methodology

The **March–Dollase** model (Dollase, 1986, based on March, 1932) describes the pole-density of crystallites after axially-symmetric volume-conserving compression/elongation. The intensity correction factor for reflection `k`, whose scattering (reciprocal-lattice) vector makes angle `α` with the preferred-orientation axis, is:

```
P(α) = ( r²·cos²α + r⁻¹·sin²α )^(−3/2)
```

- `r` = **March parameter** (the sole refinable variable); `α` = angle between the reflection's scattering vector and the preferred-orientation axis (reciprocal-lattice vector along the texture axis).
- `r = 1` → random orientation, P(α) = 1 for all α. In flat-plate (symmetric reflection) geometry, platy (disk-like) crystallites aligned with the surface give `r < 1` (correction > 1 for reflections with scattering vector along the texture axis, i.e., α→0); needle-like crystallites give `r > 1`; the sense is reversed in capillary (Debye–Scherrer) geometry (see Howard & Kisi, 2000; the March coefficient transforms as r → r^(−1/2) between the two geometries).
- The distribution is normalized over the sphere: `∫₀^{π/2} P(α)·sinα dα = 1` (conserves total scattered intensity; the normalization constant is irrelevant in Rietveld refinement because it is absorbed into the scale factor).
- Full expression for general (non-axially symmetric) sample/diffractometer geometry (TOPAS "generalised March–Dollase"): the single-parameter form above is replaced by an azimuthal average `f(r,α,Δ) = (1/2π)·∫₀^{2π} [ r²·cos²ρ + r⁻¹·sin²ρ ]^(−3/2) dφ` with `cos ρ = cosα·cosΔ − sinα·sinΔ·sinφ`, where `Δ` is the angle between the diffraction vector and the specimen axis (Δ = 0 symmetric reflection, Δ = π/2 capillary transmission); the integral is evaluated numerically (N = 16 point midpoint sum is "usually sufficient" per TOPAS documentation).

### Implementation recommendation

(b) **March–Dollase**: multiply each reflection intensity by `P_k = (r²·cos²α_k + r⁻¹·sin²α_k)^(−3/2)`, with `α_k` = angle between `Q_k = h a* + k b* + l c*` and the preferred-orientation axis `Q_PO`. Default geometry: symmetric reflection (`Δ = 0`), i.e., the plain closed form (no numeric azimuthal integral). Refine `r` subject to `r > 0` (TOPAS uses a lower bound ≈ 0.0001; sensible range ≈ 0.5–2; values outside ~0.3–3 indicate a poor texture model). Optionally expose the generalized azimuthal-average form for capillary samples.

---

## 3. Crystallite-size broadening: Scherrer and double-Voigt

### Validated methodology

**Scherrer equation** (Scherrer, 1918):

```
D = K·λ / (β·cosθ)
```

- `D` = apparent (volume-weighted) crystallite size along the reflection normal; `β` = peak breadth in radians (2θ) — FWHM or integral breadth; `λ` in the same units as D.
- The Scherrer constant `K` depends on the definition of `β` and crystallite shape: `K ≈ 0.89–0.94` with FWHM for spheres; `K = 1` with integral breadth / as used by GSAS-II; `K = 4/3` for the mean volume-weighted size with FWHM (Ida et al.). The literature uses 0.89, 0.9, 0.94, 1.0 "arbitrarily" (Izumi review) — the convention must be reported.

**Size-broadening contribution to FWHM (accepted form):**

```
FWHM_L(size) = K·λ / (D·cosθ)     [radians 2θ]        ⇒  confirmed for K ≈ 1
```

- In GSAS-II the **Lorentzian isotropic size** term `LX` gives `FWHM_L (centideg) = X/cosθ`, and the size is read directly:

```
D = 18000·K·λ / (π·LX)            [X in centidegrees, λ in Å → D in Å; K ≈ 1 default]
```

  (ug11bm wiki / GSAS-II: "particle size = (18000·K·λ)/(π·LX)"; with K = 1 this is the Scherrer form since centideg = (π/18000) rad·... ). Because size broadening is ∝ 1/cosθ (constant in d*, i.e., all orders broaden equally in Q), the Lorentzian X term is the standard isotropic size channel.
- **Gaussian size broadening** (rare; tight monodisperse size distributions): GSAS-II `GP` / FullProf `IG` enters the Gaussian variance as `σ² = ... + GP/cos²θ` (i.e., a `P·sec²θ` term, RIETAN-94 Eq. 5).

**Double-Voigt approach** (Balzar & Ledbetter, 1993; Balzar, 1999; implemented in FullProf "double-Voigt" and ReX): both the **size-** and **strain-broadened** intrinsic profiles are each modeled as a Voigt (Gaussian + Lorentzian integral-breadth components), yielding four isotropic parameters: `β_G^size, β_L^size, β_G^strain, β_L^strain` (integral breadths, radians). The volume-weighted and surface-weighted domain sizes and strains are derived from these breadths:

```
D_V = λ / (β_S·cosθ)                                  [Scherrer/FullProf Eq. 14; β_S = size integral breadth]
```

- Physically: the volume-weighted apparent size follows from the size-broadened integral breadth; for a pure-Lorentzian size profile (the common case, GSAS-II `LGmix = 1`) this reduces to `D_V = λ/(β_L^size·cosθ)`.
- In Rietveld practice the instrumental Voigt parameters (from a standard) are added to the sample Voigt breadths, the observed profile is computed as the corresponding pseudo-Voigt, and `D_V`, `D_S` (area/surface-weighted) and strains are reported after refinement.

### Implementation recommendation

(c) **Scherrer/double-Voigt crystallite size**: for the default isotropic implementation, add to the Lorentzian width `Γ_L = X/cosθ + Y·tanθ` and report `D = 18000·K·λ/(π·LX)` with `K = 1` (state the convention). If a Gaussian size term is used, add `GP/cos²θ` to `σ²` (GSAS convention). For a full double-Voigt, refine the four integral breadths `β_G,L^(size,strain)` and compute `D_V = λ/(β_L^size·cosθ)` and `D_S` (surface-weighted) from the size breadths following Balzar (1999). Constrain all breadths ≥ 0; refine size and strain *separately/sequentially* because U,V,W,X,Y (and size vs. strain) are strongly correlated (Toby recommendations).

---

## 4. Microstrain broadening

### Validated methodology

Microstrain (residual stress / lattice-parameter variation, `ε = Δd/d`) broadens peaks ∝ tanθ because a fixed `Δd/d` corresponds to `Δ(2θ) = −2·(Δd/d)·tanθ` (from differentiating Bragg's law). The accepted breadth–strain relations:

```
Gaussian:    FWHM_G / β_G = 4·ε·tanθ        (max-strain convention, Stokes–Wilson "apparent" strain)
Lorentzian:  FWHM_L      = (coefficient)·ε·tanθ
```

- The Stokes–Wilson **maximum strain** ε from the strain integral breadth β_D (FullProf Eq. 17): `ε = (1/4)·β_D·cotθ`, i.e., `β_D = 4·ε·tanθ`. The constant C in `β = C·ε·tanθ` lies between 4 and 5 in the literature, with **C = 4** the upper-limit (maximum-strain) value (Izumi review; Stokes & Wilson, 1944; Klug & Alexander).
- Alternative strain metrics: `ε_rms` (root-mean-square strain, Gauss strain distribution) with `ε = (√(2π/2))·ε_rms`... in the Gaussian-distribution case `ε_max ≈ (5/4)·ε_rms` (FullProf/Balzar). Strain type must always be stated.
- **GSAS-II isotropic strain**: single scalar (Δd/d), most commonly **Lorentzian** (`LGmix = 1`): `FWHM_L (centideg) = LY·tanθ`, reported as `strain (%) = 100·LY·π/18000` (i.e., in radians `FWHM_L = ε·tanθ`, coefficient 1 — the GSAS-II strain parameter is *defined* as the tangent coefficient). Gaussian strain is folded into the `GU` term (which also contains the instrumental contribution and must be separated using an instrument standard).
- **Anisotropic strain**: uniaxial (two values + axis) or general (Stephens model; 2–15 terms depending on Laue class); FullProf uses `X_e, Y_e` anisotropic coefficients.
- Because size (∝ 1/cosθ) and strain (∝ tanθ) have different θ-dependence, they can be separated — but with strong correlation, so the instrumental profile must be fixed first from a well-crystallized standard (e.g., NIST SRM 660).

### Implementation recommendation

(d) **Isotropic microstrain**: add `LY·tanθ` to the Lorentzian FWHM (radians) with `ε = LY_rad` (GSAS-II convention; report strain as `Δd/d`, dimensionless, and/or %), or a Gaussian strain term `(4ε·tanθ)²` added to `σ²` if a Gaussian strain model is used. Implement the physical relation `FWHM_strain = 4·ε·tanθ` (max-strain) for the Gaussian/FullProf path and document which convention (max vs. rms vs. tangent-coefficient) is reported. Default: Lorentzian isotropic microstrain, size fixed from instrument calibration.

---

## 5. R-factors, χ² and goodness-of-fit (GoF)

### Validated methodology

Weights — **counting statistics** (Poisson):

```
w_i = 1/σ²(y_i)   ,   σ²(y_i) ≈ y_i  (for raw counts; y_i including background)
```

`w_i = 1/σ²[y_obs,i]` is optimal (minimum-variance) when errors are purely statistical (Prince, 2004; David, 2004). GSAS-II and FullProf compute weights from the counting statistics of each histogram (with an optional esd multiplier for non-normalized data).

**Standard definitions** (as in GSAS-II, FullProf, and the IUCr 1999 guidelines; y_obs,i and y_calc,i = observed/calculated intensities at profile point i, background included in the model):

```
Rwp² = Σ w_i (y_obs,i − y_calc,i)² / Σ w_i y_obs,i²          (weighted profile R; numerator is the minimized quantity)
Rp   = Σ |y_obs,i − y_calc,i| / Σ y_obs,i                    (unweighted profile R)
Rexp² = (N − P + C) / Σ w_i y_obs,i²                         (expected/statistically-best Rwp; N obs, P params, C constraints)
χ²    = Σ w_i (y_obs,i − y_calc,i)² / (N − P + C)            (reduced chi-squared)
     = (Rwp / Rexp)²
GoF   = √χ² = Rwp / Rexp                                     (goodness-of-fit; GSAS-II reports "GoF")
```

- When background is refined as part of the model, a high background artificially lowers Rwp; the background-subtracted Rwp should also be reported (IUCr 1999).
- `Rexp` measures data quality; the ideal model gives `Rwp → Rexp`, `χ² → 1`, `GoF → 1`. `χ² < 1` means σ's overestimated (or over-fitting); `χ² ≫ 1` means underestimated σ's, unmodeled systematic effects, or an incomplete model (Toby, 2006).
- Optional intensity-based indices: `R_Bragg = Σ|I_obs − I_calc|/Σ I_obs`, `R_F`, `R_F2` (FullProf, GSAS-II). (b–s) (background-subtracted) variants of Rwp/Rexp are recommended for a more realistic quality measure (David, 2004/2016).
- `N` is the number of profile points; because N ≫ number of reflections, Rietveld esd's derived via χ² are often underestimated by ≈3× for structural parameters (UCL errors notes) — see §7.

### Implementation recommendation

(e) **R-factors/χ²/GoF**: compute weights as `w_i = 1/σ_i²`, with `σ_i = √y_obs,i` (Poisson; apply the user-supplied esd multiplier if present). Implement exactly the four formulas above, reporting `Rwp`, `Rp`, `Rexp`, `reduced χ²`, and `GoF = Rwp/Rexp`. Report all five; note the background-subtracted `Rwp` separately when the background is refined.

---

## 6. Peak truncation and background model

### Validated methodology

**Truncation** — limiting profile evaluation to ~n·FWHM around each peak is standard practice:

- Classical guideline (UCL Profile Fitting notes): because Gaussian tails decay rapidly, "for practical purposes the range can usually be limited to **3·H**" (H = FWHM); reflections farther than 1.5·H from a point may be ignored.
- **GSAS-II**: peak tails are truncated by the **"peak cutoff"** control ("where to stop computing peak tails (smaller ⇒ slower) – set to match experimental signal-to-noise", Toby). In the actual CW profile computation, GSAS-II bounds each peak's evaluation region at **20 FWHM to 50 FWHM** (asymmetric; low-angle side extended for axial divergence, reversed above 2θ = 90°; `getWidthsCW` uses 50 low / 75 high FWHM). The docs for the peak-profile routines state xdata is "bounded by 20 FWHM to 50 FWHM". Lorentzian tails fall slowly, so Lorentzian-dominated peaks (sample-broadened) need wide truncation.
- **FullProf**: an explicit **profile cutoff parameter `PC`**; `PC > 1` means the evaluation window is `peak position ± PC·FWHM` (the `.ins` manual). 
- Conclusion: truncation at ≈20·FWHM is typical and safe for Gaussian-dominated (instrumental) peaks; 20–75·FWHM asymmetric windows are used in GSAS-II for Lorentzian tails + FCJ asymmetry; the cutoff should be matched to the data's signal-to-noise.

**Background model** — Chebyshev polynomials are standard and recommended in GSAS-II:

- GSAS-II's recommended default is background **type 1 = Chebyshev polynomial** ("use ... with as many terms as needed", Toby recipes; USNA tutorial: "Chebyshev polynomial is recommended with as many terms as needed", typically 3–8+ terms). Available types: `chebyshev`, `chebyshev-1`, cosine, Q²/Q⁻² power series, and linear/inverse/log interpolation (`GSASIIpwd.getBackground`).
- Modern codes treat the background as part of the calculated profile `y_calc` (fitted, not pre-subtracted); the classic UCL discussion confirms polynomial functions are "the most popular" refinable background, with a caution that they may absorb diffuse/amorphous scattering ("lumps") and correlate with average displacement parameters.

### Implementation recommendation

(g) **Truncation**: evaluate each reflection only over `[2θ_k − n₁·FWHM, 2θ_k + n₂·FWHM]`, default `n₁ = n₂ = 20` (or asymmetric 20/50 with axial-divergence extension), with FWHM from the TCH total-FWHM formula; make the cutoff user-adjustable. **Background**: model the background as a Chebyshev polynomial `B(x) = Σ_{j=0}^{N_b−1} b_j·T_j(x̄)`, `x̄ ∈ [−1,1]` normalized over the pattern (GSAS-II convention; Chebyshev basis on the normalized 2θ range), with a default of 3–6 terms and 6–8 recommended for curved backgrounds; include B(x) in `y_calc` (do not subtract before fitting). Optionally support interpolation-based backgrounds.

---

## 7. Parameter uncertainties (esd's) from the covariance matrix

### Validated methodology

After convergence of nonlinear least squares with weights `w_i = 1/σ_i²`, the estimated standard deviation (esd / standard uncertainty) of refined parameter `p_j` is:

```
σ(p_j) = √( χ² · (A⁻¹)_jj )  =  √(A⁻¹)_jj · Rwp / Rexp
```

where `A` is the (weighted) normal/curvature matrix, `A = Σ_i w_i (∂y_calc,i/∂p_j)(∂y_calc,i/∂p_k)` (Jacobian squared, optionally with Marquardt damping removed after convergence), and `(A⁻¹)_jj` is the j-th diagonal element of the inverted matrix (variance–covariance matrix). Equivalent form: `σ(p_j) = √( [Σ w_i (y_obs−y_calc)²/(N−P)] · (A⁻¹)_jj )`. (UCL "Estimated Standard Deviations" page; GSAS-II/Von Dreele notes: "esd's ... σ = √(Σb w (I_o−I_c)²/(n−m) · A⁻¹_jj); bii = diagonal elements of the inverted A matrix".)

- **Scaling by GoF**: some programs multiply the covariance-matrix esd's by `GoF` (=√χ²). GSAS-II and the UCL formulation effectively do this through `χ²` in `σ = √(χ²·(A⁻¹)_jj)`. Von Dreele notes "there is little justification for additional scaling of the σ_i" beyond this, and Toby (2006) cautions that blanket multiplication by `G` is a "Band-Aid" — it is only valid when the χ² inflation is correlated with the parameter of interest.
- **Covariance and correlation**: `cov(p_j,p_k) = χ²·(A⁻¹)_jk`; correlation coefficient `c_jk = (A⁻¹)_jk/√((A⁻¹)_jj·(A⁻¹)_kk)` (range −1…+1). Correlations identify unstable/over-parameterized refinements.
- **Validity caveats**: esd's are only meaningful if the model is correct and fully converged. Because Rietveld counts N profile points but the effective independent observations ≈ number of reflections, esd's on structural parameters are typically underestimated by ≈3× (UCL notes); for parameters like the unit cell that respond to peak positions, N-profile-point counting is more appropriate. Systematic errors bias parameters beyond their σ's.
- **Derived quantities** (e.g., size `D` from `LX`, strain from `LY`): propagate through the covariance matrix (GSAS-II "pseudo-variables" / `ComputeDepESD`): for `g(p)`, `σ_g² = J_gᵀ·Cov·J_g`.

### Implementation recommendation

(f) **Uncertainty from covariance**: after the final refinement cycle, recompute `A = Σ_i w_i (∂y_calc,i/∂p)^T (∂y_calc,i/∂p)` (without Marquardt damping), invert to get `Cov = A⁻¹` (use SVD/pseudo-inverse with singularity detection, as GSAS-II does), and set `esd_j = √(χ²·Cov_jj)` with `χ² = Σ w_i (y_obs−y_calc)²/(N−P)`. Report esd's for all refined parameters; propagate to derived quantities (size, strain, cell volume, etc.) via `σ_g = √(Jᵀ·Cov·J)`. Optionally expose the "scale by GoF" toggle (default: applied, as in GSAS-II/FullProf). Guard against non-positive-definite `A` and flag high correlations (|c| > ~0.9) to the user.

---

## Consolidated implementation specification

| # | Feature | Recommended implementation (exact formulas / constants) |
|---|---------|----------------------------------------------------------|
| (a) | Area-normalized pseudo-Voigt | `pV(x)=η·L+(1−η)·G`; `L=(2/(πΓ))·(1+4x²/Γ²)⁻¹`, `G=(2/Γ)√(ln2/π)·exp(−4ln2·x²/Γ²)`. `Γ_G²=U tan²θ+V tanθ+W`, `Γ_L=X/cosθ+Y tanθ`; TCH: `Γ⁵=Γ_G⁵+2.69269Γ_G⁴Γ_L+2.42843Γ_G³Γ_L²+4.45163Γ_G²Γ_L³+0.07842Γ_GΓ_L⁴+Γ_L⁵`, `η=1.36603(Γ_L/Γ)−0.47719(Γ_L/Γ)²+0.11116(Γ_L/Γ)³`. η∈[0,1]; 0=Gauss, 1=Lorentz. Caglioti `FWHM²=U tan²θ+V tanθ+W`. |
| (b) | March–Dollase PO | `P(α)=(r²cos²α + r⁻¹sin²α)^(−3/2)`; α = angle(scattering vector, PO axis); r=1 random; refine r>0 (bound ≈0.0001–∞; sensible 0.5–2). Symmetric-reflection closed form; generalized azimuthal average for capillary. |
| (c) | Scherrer / double-Voigt size | `FWHM_L(size)=K·λ/(D·cosθ)` rad (K≈1). GSAS-II: `FWHM_L(cd)=LX/cosθ`, `D=18000·K·λ/(π·LX)` (X in centideg, λ→Å). Gaussian size: `σ²+=GP/cos²θ`. Double-Voigt: refine `β_G,L^(size,strain)`; `D_V=λ/(β_S cosθ)` per Balzar. |
| (d) | Isotropic microstrain | `ε=Δd/d`; `FWHM_G=4ε·tanθ` (max strain) or `FWHM_L=ε·tanθ` (GSAS-II coefficient convention). GSAS-II: `FWHM_L(cd)=LY·tanθ`, `strain(%)=100·LY·π/18000`. Separate via tanθ vs 1/cosθ dependence; fix instrument from standard first. |
| (e) | R-factors / χ² / GoF | `w_i=1/σ_i²`, `σ_i=√y_obs,i`. `Rwp²=Σw(y_o−y_c)²/Σw·y_o²`; `Rp=Σ|y_o−y_c|/Σy_o`; `Rexp²=(N−P+C)/Σw·y_o²`; `χ²=Σw(y_o−y_c)²/(N−P+C)=(Rwp/Rexp)²`; `GoF=√χ²`. |
| (f) | esd from covariance | `Cov=A⁻¹`, `A=Σ w·JᵀJ` (un-damped, final cycle); `esd_j=√(χ²·Cov_jj)`; propagate to derived params via `σ_g=√(Jᵀ Cov J)`. |
| (g) | Truncation & background | Evaluate peaks over `2θ_k ± n·FWHM`, default n=20 (asymmetric 20/50 + axial-divergence extension in GSAS-II); user-adjustable. Background = Chebyshev `Σ b_j T_j(x̄)`, `x̄∈[−1,1]`, default 3–6 (recommend 6–8) terms, included in y_calc. |

---

## Key references

1. Thompson, Cox & Hastings (1987), *J. Appl. Cryst.* **20**, 79–83 — TCH pseudo-Voigt parameterization (η(Γ_G,Γ_L), mixing).
2. Caglioti, Paoletti & Ricci (1958), *Nucl. Instrum.* **3**, 223 — FWHM² = U tan²θ + V tanθ + W.
3. Rietveld (1969), *J. Appl. Cryst.* **2**, 65–71 — profile refinement method.
4. Finger, Cox & Jephcoat (1994), *J. Appl. Cryst.* **27**, 892–900 — low-angle axial-divergence asymmetry.
5. Dollase (1986), *J. Appl. Cryst.* **19**, 267–272; March (1932), *Z. Kristallogr.* **81**, 285 — preferred orientation; see also Howard & Kisi (2000) for Debye–Scherrer geometry.
6. Scherrer (1918); Klug & Alexander (1974) — Scherrer equation; Ida et al. for K = 4/3.
7. Balzar & Ledbetter (1993); Balzar (1999), "Voigt-function model in diffraction line-broadening analysis", IUCR monograph (and Balzar & Popa, 2004) — double-Voigt approach.
8. Stokes & Wilson (1944); FullProf "Microstructural effects" manual (J. Rodríguez-Carvajal) — strain `β_D = 4·ε·tanθ`, Scherrer `D_V = λ/(β_S cosθ)`.
9. Toby (2006), "R factors in Rietveld analysis: how good is good enough?", *Powder Diffr.* **21**; IUCr Rietveld refinement guidelines (1999); David (2004/2016) — R-factors, Rexp, χ².
10. GSAS-II documentation (Toby & Von Dreele, 2013): `GSASIIpwd` profile equations, `getFWHM`/`getgamFW`/`getWidthsCW`, peak-cutoff & background functions; APS 11-BM wiki "GSAS Profile Terms" (LX/LY ↔ size/strain conversions); Von Dreele, "The Rietveld Refinement Method in GSAS-II" (esd from inverted A matrix).
11. Izumi, "Implementation of the Williamson–Hall and Halder–Wagner Methods into RIETAN-FP" — strain constant C ∈ [4,5]; GSAS/RIETAN-FP size & strain relations.
12. TOPAS generalised March–Dollase documentation (topas.awh.durham.ac.uk) — azimuthal-integral form, N=16.
13. UCL "Rietveld refinement" teaching pages (pd.chem.ucl.ac.uk) — R-factors, truncation ~3·H, esd = √(χ² A⁻¹_jj), correlation coefficients.
14. Beyer, Roth & Iversen (2021), arXiv:2106.08388 — exact normalized TCH forms and constants.
