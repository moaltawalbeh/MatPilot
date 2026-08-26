"""Add instrument workspace tables: instrument_batches, instrument_experiments,
and technique-specific experiment tables (xrd, ftir, raman, uvvis).

Also adds batch_id index on instrument_experiments for efficient batch queries.

Revision ID: 0002_instrument_workspace
Revises: 0001_initial
Create Date: 2026-08-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002_instrument_workspace"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── instrument_batches ────────────────────────────────────────────
    op.create_table(
        "instrument_batches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id"),
            nullable=False,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("technique", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="Created"),
        sa.Column("sample_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("warning_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_instrument_batches_project_id", "instrument_batches", ["project_id"])
    op.create_index("ix_instrument_batches_owner_id", "instrument_batches", ["owner_id"])
    op.create_index(
        "ix_instrument_batches_project_technique",
        "instrument_batches",
        ["project_id", "technique"],
    )

    # ── instrument_experiments (base table for STI) ───────────────────
    op.create_table(
        "instrument_experiments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id"),
            nullable=True,
        ),
        sa.Column(
            "batch_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("instrument_batches.id"),
            nullable=True,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("instrument_type", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("material", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True, server_default="Created"),
        sa.Column("technique", sa.String(length=50), nullable=True, server_default="xrd"),
        sa.Column("uploaded_filename", sa.String(length=500), nullable=True),
        sa.Column("wavelength", sa.Float(), nullable=True),
        sa.Column("radiation", sa.String(length=50), nullable=True),
        sa.Column("data_points", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("two_theta_range", sa.JSON(), nullable=True),
        sa.Column("file_ids", sa.JSON(), nullable=True),
        sa.Column("primary_file_id", sa.String(length=500), nullable=True),
        sa.Column("has_pattern_data", sa.Boolean(), nullable=True, server_default="false"),
        sa.Column("has_crystal_structure", sa.Boolean(), nullable=True, server_default="false"),
        sa.Column("job_ids", sa.JSON(), nullable=True),
        sa.Column("has_results", sa.Boolean(), nullable=True, server_default="false"),
        sa.Column("raw_two_theta", sa.JSON(), nullable=True),
        sa.Column("raw_intensity", sa.JSON(), nullable=True),
        sa.Column("raw_x", sa.JSON(), nullable=True),
        sa.Column("raw_y", sa.JSON(), nullable=True),
        sa.Column("analysis_results", sa.JSON(), nullable=True),
        sa.Column("processed_pattern", sa.JSON(), nullable=True),
        sa.Column("pipeline_stages", sa.JSON(), nullable=True),
        sa.Column("analysis_history", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_instrument_experiments_project_id", "instrument_experiments", ["project_id"])
    op.create_index("ix_instrument_experiments_batch_id", "instrument_experiments", ["batch_id"])
    op.create_index("ix_instrument_experiments_owner_id", "instrument_experiments", ["owner_id"])
    op.create_index(
        "ix_instrument_experiments_project_technique",
        "instrument_experiments",
        ["project_id", "technique"],
    )

    # ── xrd_experiments (child table) ─────────────────────────────────
    op.create_table(
        "xrd_experiments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("instrument_experiments.id"),
            primary_key=True,
        ),
        sa.Column("processed_intensity", sa.JSON(), nullable=True),
        sa.Column("radiation_type", sa.String(length=50), nullable=True, server_default="Cu"),
        sa.Column("wavelength_angstrom", sa.Float(), nullable=True),
        sa.Column("detected_peaks", sa.JSON(), nullable=True),
        sa.Column("candidate_phases", sa.JSON(), nullable=True),
        sa.Column("cif_files", sa.JSON(), nullable=True),
        sa.Column("selected_refinement_phases", sa.JSON(), nullable=True),
        sa.Column("rietveld_results", sa.JSON(), nullable=True),
        sa.Column("goodness_of_fit", sa.Float(), nullable=True),
    )

    # ── ftir_experiments ──────────────────────────────────────────────
    op.create_table(
        "ftir_experiments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("instrument_experiments.id"),
            primary_key=True,
        ),
        sa.Column("raw_wavenumbers", sa.JSON(), nullable=True),
        sa.Column("raw_transmittance", sa.JSON(), nullable=True),
        sa.Column("processed_transmittance", sa.JSON(), nullable=True),
        sa.Column("resolution_cm1", sa.Float(), nullable=True),
        sa.Column("scan_count", sa.Integer(), nullable=True),
        sa.Column("background_type", sa.String(length=50), nullable=True),
        sa.Column("detected_peaks", sa.JSON(), nullable=True),
        sa.Column("functional_groups", sa.JSON(), nullable=True),
        sa.Column("library_matches", sa.JSON(), nullable=True),
        sa.Column("signal_to_noise_ratio", sa.Float(), nullable=True),
    )

    # ── raman_experiments ─────────────────────────────────────────────
    op.create_table(
        "raman_experiments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("instrument_experiments.id"),
            primary_key=True,
        ),
        sa.Column("raw_raman_shift", sa.JSON(), nullable=True),
        sa.Column("raw_intensity", sa.JSON(), nullable=True),
        sa.Column("processed_intensity", sa.JSON(), nullable=True),
        sa.Column("laser_wavelength_nm", sa.Float(), nullable=True),
        sa.Column("laser_power_mw", sa.Float(), nullable=True),
        sa.Column("exposure_time_s", sa.Float(), nullable=True),
        sa.Column("accumulations", sa.Integer(), nullable=True),
        sa.Column("detected_peaks", sa.JSON(), nullable=True),
        sa.Column("phonons", sa.JSON(), nullable=True),
        sa.Column("library_matches", sa.JSON(), nullable=True),
        sa.Column("fluorescence_background_level", sa.Float(), nullable=True),
    )

    # ── uvvis_experiments ─────────────────────────────────────────────
    op.create_table(
        "uvvis_experiments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("instrument_experiments.id"),
            primary_key=True,
        ),
        sa.Column("raw_wavelength_nm", sa.JSON(), nullable=True),
        sa.Column("raw_absorbance", sa.JSON(), nullable=True),
        sa.Column("processed_absorbance", sa.JSON(), nullable=True),
        sa.Column("tauc_energy_ev", sa.JSON(), nullable=True),
        sa.Column("tauc_quantity", sa.JSON(), nullable=True),
        sa.Column("measurement_mode", sa.String(length=50), nullable=True),
        sa.Column("scan_speed", sa.Float(), nullable=True),
        sa.Column("detected_peaks", sa.JSON(), nullable=True),
        sa.Column("band_gap_ev", sa.Float(), nullable=True),
        sa.Column("band_gap_type", sa.String(length=50), nullable=True),
        sa.Column("library_matches", sa.JSON(), nullable=True),
        sa.Column("linear_fit_r_squared", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("uvvis_experiments")
    op.drop_table("raman_experiments")
    op.drop_table("ftir_experiments")
    op.drop_table("xrd_experiments")
    op.drop_index("ix_instrument_experiments_project_technique", table_name="instrument_experiments")
    op.drop_index("ix_instrument_experiments_owner_id", table_name="instrument_experiments")
    op.drop_index("ix_instrument_experiments_batch_id", table_name="instrument_experiments")
    op.drop_index("ix_instrument_experiments_project_id", table_name="instrument_experiments")
    op.drop_table("instrument_experiments")
    op.drop_index("ix_instrument_batches_project_technique", table_name="instrument_batches")
    op.drop_index("ix_instrument_batches_owner_id", table_name="instrument_batches")
    op.drop_index("ix_instrument_batches_project_id", table_name="instrument_batches")
    op.drop_table("instrument_batches")
