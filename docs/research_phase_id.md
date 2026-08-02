# XRD Phase-Identification Scoring: Validation Research Report

**Project:** MatPilot v1.0
**Scope:** Validate the accepted scientific methodology for powder XRD phase identification (peak matching, figure-of-merit scoring, confidence assignment, reference-quality weighting).
**Status:** Research only — no production code was modified. This document contains recommendations for a future implementation phase.

---

## 0. Executive summary

| Topic | Verified conclusion | Key citation |
|---|---|---|
| 1. Smith–Snyder `F_N` | `F_N = (1/\|Δ2θ̄\|) · (N/N_poss)`; ranking superior to `M20`; **the ">10 acceptable, >30 good, >60 excellent" table could NOT be verified** from accessible sources | Smith & Snyder, *J. Appl. Cryst.* 12, 60–65 (1979) |
| 2. de Wolff `M20` | `M20 = Q20 / (2·ε̄·N20)`; `M20 < 6` doubtful; 20–60 good; `>10` (with ≤2 unindexed lines below Q20) substantially correct | de Wolff, *J. Appl. Cryst.* 1, 108–113 (1968) |
| 3. Commercial scoring | All packages rank by a per-candidate FoM and treat it as **screening**, not proof; confirmation is whole-pattern (Rietveld) refinement | Match! manual; Degen et al. (2014); Rigaku J. 26(1) |
| 4. Greedy vs Hungarian | One-to-one assignment is required to avoid score inflation; Hungarian (optimal) is feasible at XRD scale; greedy is an approximation | XMatcher (2026); matchms CosineHungarian |
| 5. Position vs intensity | Position is primary; intensity secondary/optional — intensities are texture/sample-prep sensitive | SmartLab Studio II manual; DoITPoMS; UNT lecture |
| 6. Reference quality | ICDD quality marks (★/G/I/C/P/M/B/O/H) are the de-facto standard; CIF structural metrics (R, wR, GoF, resolution) complement them | Kabekkodu et al., *Powder Diffr.* 34(4) (2019); IUCr J (2025) |

---

## 1. Topic 1 — Smith–Snyder figure of merit `F_N`

### 1.1 Validated definition

The `F_N` figure of merit was introduced to rate both the **accuracy of measured line positions** and the **completeness of the pattern**, analogous to how the `R` factor rates single-crystal structure determinations:

```
F_N = (1 / |Δ2θ̄|) · (N / N_poss)
```

where:

- `N` — the number of observed/independent diffraction lines considered (commonly 20 or 30, i.e. `F20`, `F30`);
- `N_poss` — the number of *independent* diffraction lines **possible** within the 2θ range covered by the first `N` observed lines;
- `|Δ2θ̄|` — the average absolute discrepancy between **observed and calculated** 2θ values (degrees), i.e. the mean residual of an indexation;
- Higher `F_N` = more reliable indexing.

**Counting rules for `N_poss`** (from the authoritative lecture material): count all resolvable reflections allowed by the space group, with exceptions:
- systematic absences caused by symmetry elements and lattice type are **excluded**;
- only **one** plane from a family of equivalent reflections is counted;
- reflections with the **same spacing** are treated as a single line (e.g. (333)/(511) in cubic).

**Reporting convention:** `F_N` is written as `F(N) = xx.x(y.yyy, zz)` where `xx.x` is the value, `y.yyy` the average Δ2θ error, and `zz` the number of lines possible within the 2θ range of the first `N` lines.

**Key point:** `F_N` is an *indexing-reliability* criterion (observed vs *calculated* positions from a proposed unit cell). It is **not** a search–match score. Applying it verbatim to database search–match (observed vs *reference-file* positions) changes its meaning: there is no "calculated cell," and the "possible lines" count must be interpreted via the reference entry's own space group and coverage.

### 1.2 Threshold verification (as requested)

**The commonly cited "`F_N > 10` acceptable, `> 30` good, `> 60` excellent" could not be verified** from any accessible primary or secondary source during this research. The original 1979 paper is paywalled and bot-blocked (403) at IUCr/Wiley; the widely recommended textbook table (Suryanarayana & Norton, *X-Ray Diffraction: A Practical Approach*, Springer, 1998) is paywalled.

What **was** verified from accessible sources:

- UNT / Dr. T. Golden lecture (ACA-derived material): *"Figures of Merit around 80–150 are considered high quality, while those less than 20 are poor quality."* This is the strongest explicit scale found.
- International Tables for Crystallography, Vol. H, Ch. 3.4 (indexing chapter) reports actual good indexations, e.g. `F18 = 125(0.0041, 35)`, `F20 = 102.6(0.0048, 41)`, `F20 = 77.0(0.010, 26)` — showing that **good** indexations routinely exceed `F = 50–150`.
- The paper's abstract states only that *"Guidelines are given on the use and implementation of the F_N rating"* — the concrete guidelines live in the paywalled full text.

**Honest status:** the "10/30/60" scale is **plausible but unverified** here; it should be treated as a guideline, not a law, and the report recommends reporting `F_N` values *with* their `(Δ2θ̄, N_poss)` so readers can judge independently. Any threshold used in product code should be configurable and documented as advisory.

### 1.3 Implementation recommendation (topic 1)

**(a) FOM formula(s) — position-based**

Adopt the standard `F_N`-type index only when a calculated/refined lattice exists (indexing, Pawley/Rietveld verification stage):

```
F_N = (1 / mean|Δ2θ|) · (N_matched / N_poss)
```

For the **database search–match** stage, use a position-based residual that is well defined without a cell. Two candidates, both lower-is-better:

1. RMSE (physically meaningful, recommended):
   ```
   RMSE = sqrt( (1/N_m) · Σ_i (2θ_exp_i − 2θ_ref_i)² )
   ```
2. Mean absolute residual (robust to a single outlier):
   ```
   MAE = (1/N_m) · Σ_i |2θ_exp_i − 2θ_ref_i|
   ```

**Do not** keep the current in-code pseudo-FOM `Σ|Δ2θ| / Σ(2θ_ref) · 100`: it is dimensionally odd, confounds positional accuracy with absolute-angle range, and is not supported by the literature.

---

## 2. Topic 2 — de Wolff `M20` and comparison with `F_N`

### 2.1 Validated definition (1968 original, abstract verified)

```
M20 = Q20 / (2 · ε̄ · N20)
```

- `Q20` — the `Q` value (`Q = 1/d²`) of the 20th observed **and indexed** line;
- `N20` — the number of *different* calculated `Q` values up to `Q20`;
- `ε̄` — the average discrepancy in `Q` for those 20 lines;
- Higher `M20` = more reliable indexing.

### 2.2 Validated thresholds (de Wolff, 1968)

- `M20 < 6` — "must give rise to considerable doubt about the result";
- `M20 = 20–60` — "good routine work on pure, well crystallized samples";
- `M20 > 10` with **no more than two unindexed lines below `Q20`** — "guarantees that the indexing is substantially correct."

Modern restatement (International Tables Vol. H, Ch. 3.4, and Werner, 2002): *"A rule of thumb for M20 is that if the number of unindexed peaks whose Q values are less than Q20 is not larger than 2 and if M20 > 10, then the indexing process is physically reasonable (de Wolff, 1968; Werner, 2002). This rule is often valid, but exceptions occur."*

Additional verified properties (Int. Tables):
- `M20` is **statistically expected to be ≈ 1** for completely arbitrary (random) indexing;
- `M20` has **no upper limit**;
- `M20` is explicitly **dependent on the 20-line cutoff** and on crystal class/space group — this is exactly the weakness `F_N` was designed to fix.

### 2.3 Historical notes

- **1972 clarification** (de Wolff, *J. Appl. Cryst.* 5, 243): states that the Khawas *et al.* reinterpretation of `N20` "is not that intended" — i.e. `N20` is the number of *calculated* `Q` values, not an observational count.
- **Wu 1988 modification** (*J. Appl. Cryst.* 21, 530–535): a modified de Wolff criterion proposed to better reflect indexing reliability; cited but its closed form was not re-verified here.
- **Smith & Snyder (1979):** the `F_N` ranking scheme "is shown to be superior to de Wolff's `M20` for ranking patterns. It is recommended that use of the latter be discontinued for that purpose." (They explicitly recommend against using `M20` to *rank patterns* — but it remains standard as an indexing-acceptance criterion.)

### 2.4 Implementation recommendation (topic 2)

- Use `M20` (or its `M_N` generalization) **only** as an indexing-acceptance gate in the verification stage, with the de Wolff rule (`M20 > 10` and ≤ 2 unindexed lines below `Q20`) as the documented default.
- If candidates are ranked, prefer the `F_N`-type criterion as Smith & Snyder recommend, and treat both as advisory (always expose `ε̄` and line counts).
- When a reference CIF provides a refined unit cell, `Q_calc` for candidate lines is available, so both `M20` and `F_N` can be computed for the *candidate+experiment* combined set.

---

## 3. Topic 3 — Candidate ranking scores in reference software

### 3.1 Verified findings per package

**Match! (Crystal Impact) — verified from the official user manual (UNICAMP mirror):**
- Search–match *"compares each diffraction pattern in the reference pattern database to the pattern of the unknown sample. It calculates a numerical value indicating the degree of the agreement, the so-called 'figure-of-merit' (FoM)."*
- *"The candidate entries are ranked according to their FoM values. The entries with the highest FoM are the ones that are most likely to be present."*
- **Crucial methodology:** *"There should be a Rietveld refinement of the phases selected as 'matching' against the original raw (profile) data. A successful refinement is generally taken as the proof that the [phase is present]."* → Ranking = screening; refinement = confirmation.
- Peak correlation window `Δ2θ` is set automatically from the **average FWHM** of experimental peaks (broad peaks → wider window); users can fix a smaller value.

**HighScore / HighScore Plus (Malvern Panalytical) — verified (Degen, Sadki, Bron, König, Nénert, *Powder Diffraction* 29(S2), 2014):**
- Search–match *"combines peak and profile data and instantly re-scores an existing candidate list."* Two-stage: candidate list from peak positions, then profile data re-ranks.

**PDXL (Rigaku) — verified (Rigaku Journal 26(1), 2010):**
- Proprietary *"Hybrid Search/Match algorithm"* checks the degree of coincidence between experimental data and reference entries **including modified lattice constants and preferred orientation within a specified tolerance** — designed for solid solutions and highly oriented samples.
- Iterative multi-phase workflow: identify phase 1 → *subtract its peak intensities from the experimental pattern* → search phase 2 in the residuals → repeat until no new phases can be identified.
- Rigaku/SmartLab user guidance (Hollocher, Union College): *"the lower the figure of merit, the better the match. Think of it as a residual."* → Rigaku's FoM is a **lower-is-better residual** (contrast with Match!, higher-is-better).

**SmartLab Studio II (Rigaku) — verified (Physlab operator manual):**
- Search results are *"ranked … based mainly on peak positions (and, depending on settings, relative intensities and lattice-parameter optimization)."*
- Duplicate handling built in: *"Hide phases having the same chemical formula and same crystal system … suppresses near-duplicate entries."*
- Optional filters: RIR (reference-intensity-ratio) availability; search minor components preferentially; evaluate preferred orientation; evaluate element ratio.

**GSAS-II — verified:**
- GSAS-II is **not a search–match scoring engine**; it is a full-profile Rietveld/Pawley refinement package. In modern automated workflows (e.g. RADAR-PD, arXiv:2605.12478) it is used as the **verification/refinement stage** after peak-list search–match has shortlisted candidates (typically 10–20). Confirms the two-stage philosophy above.

**Profex (open source, BGMN front end) — verified:**
- *"Full-pattern search-matching using the internal structure database (~1000 structure files)";* peak-list export for search-matching with Match!/QualX2; COD browsing; CIF import from COD, XML import from ICDD PDF-4+.

**XMatcher (2026, open source, arXiv:2607.17162)** — the most complete modern reference for scoring mechanics:
- One-to-one peak assignment (details in Topic 4).
- Returns, per candidate: **fitted shift, assigned peak pairs, angular deviations, coverage statistics, missing theoretical peaks, unexplained experimental peaks** — i.e. both support and counter-evidence, explicitly retained for inspection rather than collapsed into one number.
- A *composite score* ranks candidates, but individual components are retained for analysis. "Candidate rank = retrieval priority only; inspect score components and peak evidence before assignment."
- Supports AutoMix (mixture simulation by non-negative weighted superposition) and whole-pattern confirmation.

### 3.2 Implementation recommendation (topic 3)

**(a)–(e) synthesis for a candidate-ranking score**

The consistent, defensible design across all reviewed software is:

1. **Ranking score (screen):** a normalized composite of positional agreement (dominant), matched-line coverage, and — optionally and weakly weighted — relative-intensity agreement. Always expose the components (`n_matched`, `n_ref`, `n_unexplained`, `RMSE`, `max|Δ2θ|`, `cosine` of intensities).
2. **Counter-evidence must be visible:** "unexplained experimental peaks" and "missing strong reference peaks" should be reported, not hidden. This matches XMatcher, Match!, and PDXL's residual-subtraction philosophy.
3. **Confirmation (proof):** offer whole-pattern verification (Rietveld/Pawley-style fit) for the top candidate(s); report the resulting profile agreement. This is the accepted standard ("a successful refinement is generally taken as the proof").

---

## 4. Topic 4 — Greedy vs Hungarian peak matching; tolerances

### 4.1 Why assignment rule matters

XMatcher states the problem explicitly: *"Peak assignment is one-to-one. Each experimental peak can support at most one theoretical reflection in a candidate comparison, and each theoretical reflection can be used at most once. This avoids inflating scores when several theoretical lines happen to lie within tolerance of one broad experimental feature."*

**Greedy matching** (nearest-neighbour within tolerance) is fast but:
- does **not** guarantee one-to-one globally (an experimental peak can be re-used for several reference lines, and vice versa), inflating coverage scores;
- is order-dependent: the result can change with processing order.

**Hungarian algorithm** (`scipy.optimize.linear_sum_assignment`) finds the globally optimal one-to-one assignment for the cost matrix and is the accepted "optimal" method. In the spectral-matching literature, matchms's `CosineHungarian` documents exactly this trade-off: *"mathematically optimal but notably slower than the greedy heuristic."* At XRD scale (tens to low hundreds of peaks per pattern/entry), the Hungarian algorithm is computationally trivial — the "slowness" objection does not apply.

### 4.2 Tolerances — verified

- Match! : correlation window `Δ2θ` auto-scaled from **average FWHM** of the experimental peaks; users may override to a smaller value. So tolerance is **pattern-adaptive**, not a single magic number.
- Expert practice (ResearchGate/XRD community, verified answers): *"variations in position of a few tenths of a degree … are totally acceptable."*
- Precision context (UNT lecture): typical diffractometers reach ~0.005°–0.01° reproducibility; ~0.0005° with internal standards. Vendor goniometers advertise ±0.01° step/accuracy (e.g. Ami Lattice). Peak **position** accuracy for lab data is therefore commonly 0.02°–0.1°; search–match windows of 0.1°–0.3° are reported in practice (the current MatPilot default, `tolerance_deg = 0.15`, is squarely within the accepted range).
- `d`-space-based matching is wavelength-independent; the current code already offers this path via `compute_d_spacing`.

### 4.3 Implementation recommendation (topic 4)

**(b) Greedy vs Hungarian:**

- **Primary recommendation: Hungarian** (`scipy.optimize.linear_sum_assignment`) on a cost matrix built only for pairs with `|Δ2θ| ≤ τ` (else `inf`), with the default cost `C_ij = w_x·|Δ2θ_ij|/τ + w_I·|Irel_diff_ij|/100` (XMatcher form, `w_x + w_I = 1`; recommend `w_x = 0.7–0.8` given Topic 5 findings). This enforces true one-to-one assignment and is optimal.
- Provide a **greedy mode** only as a fast approximation for very large libraries, documented as approximate; or use greedy to prescreen then Hungarian to re-score the shortlist (matches the two-stage search–match philosophy).
- Tolerance `τ`: default `0.15°` is acceptable; offer (i) auto-scaling from median experimental FWHM (Match! precedent) and (ii) a configurable override. Clamp `0.05 ≤ τ ≤ 0.3°` as a sanity range.
- Report per candidate: `n_matched`, `n_missing_ref`, `n_unexplained_exp`, `RMSE` and `max|Δ2θ|` of matched pairs, and the **fitted global shift** `δ` (zero-offset) — large `δ` is an investigation prompt, not a hidden correction (XMatcher precedent).

---

## 5. Topic 5 — Role of relative intensity vs position-based scoring

### 5.1 Verified findings

- **Position is primary.** SmartLab Studio II: search results ranked *"based mainly on peak positions (and, depending on settings, relative intensities …)"*. UNT/ACA material: the adopted Smith & Snyder FOM *"focuses on the d_hkl values."*
- **Intensity is required but unreliable.** DoITPoMS: for phase identification, *"both peak positions and relative intensities must fit"* with **at least three peaks**; but preferred orientation, particle-size/grinding effects, and absorption make observed intensities unreliable (community answers confirm: peak-position variations of a few tenths of a degree are normal; some peaks may vanish). PDXL's Hybrid Search/Match explicitly compensates preferred orientation — evidence that raw intensity matching is problematic.
- **Hanawalt method** (UCL materials science pages) indexes by the **three most intense peaks** sorted by d-spacing — intensity is used only to select lines, not to score.
- Intensities in reference databases are **relative intensities** (I/I_max); CIF-based entries should provide structure factors from which kinematical intensities can be recomputed (the MatPilot `TheoreticalPeak` already carries `f_squared`).

### 5.2 Implementation recommendation (topic 5)

**(c) Combining position + intensity into a confidence score without corrupting physical meaning:**

- Keep the **position-based FOM as the ranking backbone** (Topics 1–2): RMSE/MAE on matched 2θ (or d), plus coverage.
- Apply **relative-intensity agreement as a secondary, weakly weighted term** (e.g. 0.15–0.3 of the composite, or as a separate reported diagnostic), **never** as the primary driver. Rationale: intensity is structurally informative but noisy (texture, sample prep).
- Normalize to a `[0,1]` confidence from the physical metrics rather than from ad-hoc thresholds:
  ```
  confidence_position = clip(1 − RMSE/τ_ref, 0, 1)          # τ_ref e.g. 0.15°
  confidence_coverage = n_matched / max(n_ref_possible, 1)
  confidence = w_pos·confidence_position + w_cov·confidence_coverage + w_int·intensity_agreement
  ```
  with `w_pos ≈ 0.6`, `w_cov ≈ 0.25`, `w_int ≈ 0.15` as a starting point (all tunable). Because the components are all physically meaningful and reported separately, the single scalar never *replaces* the evidence.
- Enforce a **minimum of three matched peaks** for a "High" confidence claim (DoITPoMS/assign_confidence precedent in the current code already does this).
- Report `cosine_similarity` of the (log-compressed) intensity vectors as a separate diagnostic (the `IdentifiedPhase` object already has the field).

---

## 6. Topic 6 — CIF / reference-entry quality scoring

### 6.1 Verified findings

**ICDD PDF quality marks (the de-facto standard):**
- The PDF is *"the only crystallographic database where every entry is editorially reviewed and marked with a quality mark,"* under an ISO 9001:2015-certified process (Kabekkodu et al., *The Powder Diffraction File: a quality materials characterization database*, *Powder Diffr.* 34(4), 2019).
- Current quality marks and tiers (verified): **high** = ★ (star) or G; **medium** = I, C, P, or M; **low** = B or O; **hypothetical** = H.
- Original criteria (Jenkins & Smith, 1987, as reproduced in the paper): an **O** mark indicates *low precision, no cell quoted, poorly chemically characterized, and possible mixture (or a combination)*; **★** = high quality, fully indexed, chemically characterized; **I** = indexed; **blank** = fails the criteria for ★/I/O or no known cell.
- Operational consequence: when searching large databases, **filter to entries with S/I (or ★/I) quality marks** (ICDD data-quality guidance).

**CIF structural quality metrics (CCDC/CSD survey, IUCr J., 2025; DOI 10.1107/S2052252525000594):**
- Recommended CIF fields to assess model quality: `_refine_ls_R_factor_gt`, `_refine_ls_wR_factor_ref`, `_refine_ls_shift/su_max`, `_refine_diff_density_max`, `_refine_diff_density_min`, `_refine_ls_goodness_of_fit_ref`, `_diffrn_reflns_theta_max` (i.e. resolution).
- Definitions (IUCr dictionary; McMaster CIF-validation notes): conventional `R = Σ|F_obs − F_calc| / Σ|F_obs|`; **wR and goodness-of-fit S are based on F²**, with `F = 0` for negative F². Higher `θ_max` ⇒ smaller d-spacing ⇒ higher resolution.
- CIFs derived from PXRD use a **different dictionary** (powder CIF / pdCIF) with different quality items — do not apply single-crystal thresholds to powder-derived CIFs directly (CSD survey explicitly excludes PXRD structures from its statistics for this reason).
- `_diffrn_reflns_resolution_max` is rarely reported (<0.015% in CSD); resolution should instead be computed from `_diffrn_radiation_wavelength` + `_diffrn_reflns_theta_max` via Bragg's law.

### 6.2 Implementation recommendation (topic 6)

**(e) CIF/reference quality scoring rules:**

- **Prefer an explicit quality tier when available** (ICDD: ★/G > I/C/P/M > B/O > H). Map to numeric priors, e.g. `q_ref ∈ {1.0, 0.85, 0.6, 0.4, 0.2}` — values are a starting point, configurable.
- **For CIF entries lacking a quality mark**, compute a structural-quality sub-score `q_cif` from available fields:
  - `R_gt ≤ 0.05`, `wR_ref ≤ 0.10`, `GoF ∈ [1.0, 2.5]`, `shift/su_max < 0.2`, resolution `d_min ≤ 1.0 Å` → high tier;
  - apply **mild penalties** for missing fields (never exclude solely on absence — the PDF keeps low-quality entries precisely because partial matches help; Kabekkodu et al.).
  - For powder-derived CIFs use pdCIF items and/or the presence of a refined lattice + full indexing (the entry's `N_poss` and space group are then computable).
- **Combine** the reference-quality prior with the matching score so that high-quality references win ties:
  ```
  final_score = match_composite · (α + (1−α)·q_ref)      # α ≈ 0.7–0.8
  ```
  Keep `q_ref` and the raw `match_composite` separately in the result so the weighting is transparent.
- **Duplicate-candidate removal (topic (d)):** follow the SmartLab precedent — suppress candidates that share the same (chemical formula, crystal system) [and optionally same space group], keeping the highest-scoring representative; also collapse near-identical source entries (same material from COD + PDF) by canonical formula + space group + cell-parameter proximity. This prevents the result list from being dominated by near-duplicate records.

---

## 7. Consolidated implementation recommendations (a)–(e)

| # | Requirement | Recommendation |
|---|---|---|
| **(a)** | FOM formula(s) | Primary: RMSE (and/or MAE) of matched 2θ/d positions. Add `F_N`-type and `M20`-type indices only in the verification stage where a refined/calculated cell exists: `F_N = (1/\|Δ2θ̄\|)·(N/N_poss)`, `M20 = Q20/(2·ε̄·N20)`. Remove the undocumented `Σ\|Δ2θ\|/Σ(2θ_ref)·100` pseudo-FOM. |
| **(b)** | Greedy vs Hungarian | Hungarian (`linear_sum_assignment`) for optimal one-to-one assignment; greedy only as documented fast mode / prescreen. Tolerance τ default 0.15°, clamp 0.05–0.3°, optionally FWHM-adaptive. |
| **(c)** | Position+intensity → confidence | Position-dominant composite: `conf = w_pos·conf_pos + w_cov·conf_cov + w_int·conf_int`, `w ≈ (0.6, 0.25, 0.15)`, min 3 matched peaks for High, report all components + cosine similarity. |
| **(d)** | Duplicate removal | Dedupe by (canonical formula + crystal system + space group + cell-proximity), keep highest scorer (SmartLab "hide same formula & same crystal system" precedent). |
| **(e)** | Reference quality | ICDD quality-mark tier as prior; CIF structural sub-score from R/wR/GoF/θ_max; combine `final = match·(α+(1−α)·q_ref)`; never hard-exclude for missing metadata; separate pdCIF thresholds for powder-derived entries. |

---

## 8. Current-implementation gaps (`backend/services/phase_identifier.py`)

Reference only — **no code changed** in this research pass.

1. **Docstring claims a FOM that is never computed.** `calculate_match_score` documents `FOM = Σ|Δ2θ|/Σ(2θ_ref)·100` but returns a `[0,1]` composite; no FOM value is produced. (phase_identifier.py:42–117)
2. **Matching is not one-to-one.** The inner loop lets one experimental peak satisfy several reference lines (and never marks experimental peaks as consumed), inflating `matched` counts and coverage scores — the exact inflation XMatcher warns about.
3. **Intensity is not really used.** `intensity_score = peak_ratio` (matched-fraction), not intensity agreement; the `intensity` field captured in correspondences is never compared against the reference's relative intensities.
4. **Confidence thresholds are ad-hoc** (0.85/0.65/0.40) with no literature anchor; the report recommends deriving them from physical components instead (Topic 5).
5. **No reference-quality term**, no duplicate suppression, no global-shift handling, and no counter-evidence reporting (`n_unexplained_exp`, `n_missing_ref`).
6. Positive attributes to preserve: tolerance-based matching, d-spacing fallback via `compute_d_spacing`, `min_score`/`max_phases` controls, and the data model (`IdentifiedPhase` already exposes `fom`, `rmse_2theta`, `cosine_similarity`; `TheoreticalPeak` carries `f_squared`).

---

## 9. References (verified in this research)

1. Smith, G. S.; Snyder, R. L. "F_N: A criterion for rating powder diffraction patterns and evaluating the reliability of powder-pattern indexing." *J. Appl. Cryst.* **12**, 60–65 (1979). DOI 10.1107/S002188987901178X. (Abstract verified via IUCr/Wiley/OSTI/Semantic Scholar; full text paywalled.)
2. de Wolff, P. M. "A simplified criterion for the reliability of a powder pattern indexing." *J. Appl. Cryst.* **1**, 108–113 (1968). DOI 10.1107/S002188986800508X. (Full abstract verified.)
3. de Wolff, P. M. clarification note, *J. Appl. Cryst.* **5**, 243 (1972). DOI 10.1107/S002188987200932X. (Abstract verified; states the Khawas interpretation of N20 "is not that intended.")
4. Wu, F. "Modification of the de Wolff figure of merit for reliability …" *J. Appl. Cryst.* **21**, 530–535 (1988). (Indexed via OSTI; closed form not re-verified.)
5. Altomare *et al.* "Indexing a powder diffraction pattern." *International Tables for Crystallography*, Vol. H, Ch. 3.4 (IUCr/Wiley). Rule-of-thumb M20 and F_N text verified via ResearchGate full-text mirror; Wiley chapter PDF bot-blocked (403).
6. Degen, T.; Sadki, M.; Bron, E.; König, U.; Nénert, G. "The HighScore suite." *Powder Diffraction* **29**(S2) (2014). (Search–match "combines peak and profile data and instantly re-scores an existing candidate list.")
7. Crystal Impact. *Match! User Manual.* (FoM ranking, candidate selection, "successful Rietveld refinement … taken as the proof," FWHM-based Δ2θ window.) Verified via UNICAMP mirror of official manual.
8. Rigaku. "PDXL — Integrated X-ray powder diffraction software." *Rigaku Journal* **26**(1), 23–27 (2010). (Hybrid Search/Match; iterative residual subtraction.)
9. Physlab / SmartLab Studio II operator manual: *Qualitative Phase Identification Analysis Using SmartLab Studio II* (2026). (Position-based ranking; "hide same formula and same crystal system"; RIR/minor-phase/preferred-orientation options.)
10. Hollocher, K. "Rigaku: Introduction to Data Analysis" (Union College). (Rigaku FoM lower-is-better.)
11. Toby, B. H.; Von Dreele, R. B. "GSAS-II …" *J. Appl. Cryst.* **46**, 544–549 (2013); GSAS-II documentation (refinement suite, not a search-match scorer).
12. Yadav *et al.* "RADAR-PD: … mismatch-tolerant ML phase identification." arXiv:2605.12478 (2026). (Two-stage: search–match screening → GSAS-II verification.)
13. Cao, B. *et al.* "XMatcher: An Open-Source Framework for X-Ray Diffraction Phase Identification." arXiv:2607.17162, DOI 10.48550/arXiv.2607.17162 (2026). (One-to-one assignment; tolerance τ; cost function; bounded global shift; composite score with counter-evidence.)
14. matchms documentation: `CosineHungarian` (scipy `linear_sum_assignment`; "optimal but notably slower than the greedy heuristic").
15. Kabekkodu, S.; Dosen, I.; Gindhart, A.; Blanton, T. "The Powder Diffraction File: a quality materials characterization database." *Powder Diffraction* **34**(4), 326–337 (2019). (Quality marks ★/G/I/C/P/M/B/O/H; ISO 9001 review.)
16. ICDD. "Evaluating Data Quality" (PDF), icdd.com. (Filter to S/I quality marks when searching.)
17. Tovee, C. A. *et al.* "A survey of crystallographic quality metrics from CIFs in the Cambridge Structural Database." *IUCrJ* (2025). DOI 10.1107/S2052252525000594. (R, wR, GoF, shift/su, residual density, θ_max/resolution.)
18. IUCr Dictionary (dictionary.iucr.org/R_factor) — R-factor definition; McMaster CIF validation notes (wR/GoF on F², R on F).
19. UNT, Dr. T. Golden. "Lecture 14 — Acquisition of Diffraction Data" (2024). (F_N notation; N_poss counting rules; "80–150 high quality, <20 poor"; Hanawalt limitations.)
20. UCL materials science pages (pd.chem.ucl.ac.uk/pxrd/qa/search.htm) — Hanawalt method (3 most intense lines sorted by d). DoITPoMS phase identification page — "both peak positions and relative intensities must fit," ≥ 3 peaks.
21. Profex (profex-xrd.org) — full-pattern search-match, COD/PDF-4+ CIF import.
22. ResearchGate XRD community answers (2022–): peak-position variations of a few tenths of a degree are acceptable.

---

*End of research report. Prepared as documentation only; no production code was modified.*
