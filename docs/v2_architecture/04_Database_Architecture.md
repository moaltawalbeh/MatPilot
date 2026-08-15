# MatPilot V2 Database Architecture

## 1. Core Philosophy
The database is designed for strict normalization of platform entities (Users, Workspaces, Files) but utilizes polymorphic or specific schemas for scientific instruments to avoid a bloated, generic "god table" for all experiments. JSONB is used *only* for algorithm parameters and multi-dimensional numerical arrays (like spectra arrays) that do not require relational querying.

## 2. Platform Core Tables
- **Users**: Authentication, profile, preferences.
- **Organizations**: Multi-tenant isolation, enterprise billing.
- **Workspaces** (replaces Projects): The central collaborative hub for a specific research study.
- **Files**: Physical file tracking (S3 paths, hashes, sizes), linked to the Workspace.

## 3. Instrument-Specific Tables Strategy
Instead of a single `experiments` table with null fields for unrelated instruments, we use a Class Table Inheritance (Polymorphism) strategy.
- **Base `InstrumentExperiments` Table**: Contains shared metadata: `id`, `workspace_id`, `instrument_type` (Enum), `name`, `status`, `created_at`.
- **Child Tables** (One-to-One with Base):
  - `xrd_experiments`: `two_theta_min`, `two_theta_max`, `anode_material`.
  - `ftir_experiments`: `resolution_cm1`, `scan_count`, `background_type`.
  - `raman_experiments`: `laser_wavelength_nm`, `grating_lines_mm`, `exposure_time_s`.
  - `uvvis_experiments`: `scan_mode`, `slit_width_nm`.

## 4. Scientific Results Tables
Results are heavily structured based on the instrument.
- **`xrd_identified_phases`**: `experiment_id` (FK), `database_ref`, `formula`, `weight_percent`, `crystallite_size_nm`.
- **`ftir_detected_peaks`**: `experiment_id` (FK), `wavenumber`, `intensity`, `functional_group`, `vibrational_mode`.
- **`raman_fitted_peaks`**: `experiment_id` (FK), `shift`, `fwhm`, `area`, `assigned_bond`.
- **`uvvis_band_gaps`**: `experiment_id` (FK), `gap_type` (Enum: Direct, Indirect), `energy_ev`, `r_squared`.

## 5. Relationships
- `Organizations` (1) to `Users` (N) (via associative table `organization_users`).
- `Workspaces` (N) to `Organizations` (1).
- `Files` (N) to `Workspaces` (1).
- `InstrumentExperiments` (N) to `Workspaces` (1).
- `InstrumentExperiments` (1) to `xrd_experiments` / `ftir_experiments` etc. (0 or 1).
- `Files` (N) to `InstrumentExperiments` (M) (via `experiment_files`).

## 6. AI Interpretations
- **`ai_interpretations`**: `id`, `experiment_id` (FK), `instrument_type`, `raw_prompt` (JSON), `interpretation_text` (TEXT), `confidence_score` (FLOAT), `created_at`.

## 7. Unified Workspace Reports
- **`workspace_reports`**: `id`, `workspace_id` (FK), `title`, `executive_summary`, `generated_at`.
- **`workspace_report_items`**: `report_id` (FK), `experiment_id` (FK), `order_index`.

## 8. Indexing Strategy
- **B-Tree Indexes**: Applied to all Foreign Keys (`workspace_id`, `experiment_id`) and search-heavy fields (`name`, `status`).
- **GIN Indexes**: Applied to JSONB metadata fields (e.g., `parameters` within `ftir_experiments`) to allow querying specific parameter keys.

## 9. Handling Future Instruments
To add "SEM":
1. Create `sem_experiments` table with a Foreign Key to `InstrumentExperiments`.
2. Create `sem_image_features` for results.
3. No changes needed to `Workspaces`, `Users`, or other instrument tables.
