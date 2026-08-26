from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    email_verification_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_verification_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    email_verification_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    password_reset_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_reset_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="RESEARCHER")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE")
    organization_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    default_wavelength: Mapped[float | None] = mapped_column(Float, nullable=True)
    preferred_providers: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    language: Mapped[str | None] = mapped_column(String(10), nullable=True, default="en")
    timezone: Mapped[str | None] = mapped_column(String(50), nullable=True, default="UTC")
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    login_count: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProjectModel(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    material: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True, default="Active")
    tags: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class SampleModel(Base):
    __tablename__ = "samples"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    formula: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True, default="DRAFT")
    crystal_system: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tags: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class MeasurementModel(Base):
    __tablename__ = "measurements"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sample_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("samples.id"), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True, default="QUEUED")
    instrument: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    scan: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    data_points: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class CrystalStructureModel(Base):
    __tablename__ = "crystal_structures"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    formula: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    space_group: Mapped[str | None] = mapped_column(String(50), nullable=True)
    crystal_system: Mapped[str | None] = mapped_column(String(50), nullable=True)
    a: Mapped[float | None] = mapped_column(Float, nullable=True)
    b: Mapped[float | None] = mapped_column(Float, nullable=True)
    c: Mapped[float | None] = mapped_column(Float, nullable=True)
    alpha: Mapped[float | None] = mapped_column(Float, nullable=True)
    beta: Mapped[float | None] = mapped_column(Float, nullable=True)
    gamma: Mapped[float | None] = mapped_column(Float, nullable=True)
    cif_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    peak_count: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    tags: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class InstrumentBatchModel(Base):
    __tablename__ = "instrument_batches"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("projects.id"), index=True, nullable=False)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=True)
    technique: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Created")
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    warning_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class InstrumentExperimentModel(Base):
    __tablename__ = "instrument_experiments"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("projects.id"), index=True, nullable=True)
    batch_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("instrument_batches.id"), index=True, nullable=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=True)
    
    instrument_type: Mapped[str] = mapped_column(String(50), nullable=False)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    material: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True, default="Created")
    technique: Mapped[str | None] = mapped_column(String(50), nullable=True, default="xrd")
    uploaded_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    wavelength: Mapped[float | None] = mapped_column(Float, nullable=True)
    radiation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    data_points: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    two_theta_range: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    file_ids: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    primary_file_id: Mapped[str | None] = mapped_column(String(500), nullable=True)
    has_pattern_data: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    has_crystal_structure: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    job_ids: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    has_results: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    raw_two_theta: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    raw_intensity: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    raw_x: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    raw_y: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    analysis_results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    processed_pattern: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Generic execution history
    pipeline_stages: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    analysis_history: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __mapper_args__ = {
        "polymorphic_identity": "base",
        "polymorphic_on": "instrument_type",
    }


class XRDExperimentModel(InstrumentExperimentModel):
    __tablename__ = "xrd_experiments"

    id: Mapped[uuid.UUID] = mapped_column(ForeignKey("instrument_experiments.id"), primary_key=True)
    
    processed_intensity: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    radiation_type: Mapped[str | None] = mapped_column(String(50), nullable=True, default="Cu")
    wavelength_angstrom: Mapped[float | None] = mapped_column(Float, nullable=True)
    detected_peaks: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    candidate_phases: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    cif_files: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    
    selected_refinement_phases: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    rietveld_results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    goodness_of_fit: Mapped[float | None] = mapped_column(Float, nullable=True)

    __mapper_args__ = {
        "polymorphic_identity": "XRD",
    }


class FTIRExperimentModel(InstrumentExperimentModel):
    __tablename__ = "ftir_experiments"

    id: Mapped[uuid.UUID] = mapped_column(ForeignKey("instrument_experiments.id"), primary_key=True)
    
    raw_wavenumbers: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    raw_transmittance: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    processed_transmittance: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    
    resolution_cm1: Mapped[float | None] = mapped_column(Float, nullable=True)
    scan_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    background_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    detected_peaks: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    functional_groups: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    library_matches: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    
    signal_to_noise_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)

    __mapper_args__ = {
        "polymorphic_identity": "FTIR",
    }



class AnalysisJobModel(Base):
    __tablename__ = "analysis_jobs"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    experiment_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("experiments.id"), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True, default="PENDING")
    analysis_type: Mapped[str] = mapped_column(String(100), nullable=False)
    parameters: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    progress: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class AnalysisResultModel(Base):
    __tablename__ = "analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("analysis_jobs.id"), nullable=True)
    experiment_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("experiments.id"), nullable=True)
    result_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    result_data: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class ReportModel(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    experiment_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("experiments.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    report_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    parameters: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class CollectionModel(Base):
    __tablename__ = "collections"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    collection_type: Mapped[str | None] = mapped_column(String(50), nullable=True, default="CUSTOM")
    tags: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    is_public: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class DownloadModel(Base):
    __tablename__ = "downloads"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    download_type: Mapped[str] = mapped_column(String(100), nullable=False)
    source_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    experiment_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("experiments.id"), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True, default="PENDING")
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class NotificationModel(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    notification_type: Mapped[str | None] = mapped_column(String(50), nullable=True, default="SYSTEM_ALERT")
    is_read: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class SearchConfigModel(Base):
    __tablename__ = "search_configs"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    search_type: Mapped[str | None] = mapped_column(String(100), nullable=True, default="phase_identification")
    query_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    elements: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    providers: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    max_results: Mapped[int | None] = mapped_column(Integer, nullable=True, default=50)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class ActivityModel(Base):
    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class OrganizationModel(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class TeamModel(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class TeamMemberModel(Base):
    __tablename__ = "team_members"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class RamanExperimentModel(InstrumentExperimentModel):
    __tablename__ = "raman_experiments"

    id: Mapped[uuid.UUID] = mapped_column(ForeignKey("instrument_experiments.id"), primary_key=True)
    
    raw_raman_shift: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    raw_intensity: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    processed_intensity: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    
    laser_wavelength_nm: Mapped[float | None] = mapped_column(Float, nullable=True)
    laser_power_mw: Mapped[float | None] = mapped_column(Float, nullable=True)
    exposure_time_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    accumulations: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    detected_peaks: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    phonons: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    library_matches: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    
    fluorescence_background_level: Mapped[float | None] = mapped_column(Float, nullable=True)

    __mapper_args__ = {
        "polymorphic_identity": "RAMAN",
    }


class UVVisExperimentModel(InstrumentExperimentModel):
    __tablename__ = "uvvis_experiments"

    id: Mapped[uuid.UUID] = mapped_column(ForeignKey("instrument_experiments.id"), primary_key=True)
    
    raw_wavelength_nm: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    raw_absorbance: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    processed_absorbance: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    
    tauc_energy_ev: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    tauc_quantity: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    
    measurement_mode: Mapped[str | None] = mapped_column(String(50), nullable=True, default="Transmission")
    scan_speed: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    detected_peaks: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    band_gap_ev: Mapped[float | None] = mapped_column(Float, nullable=True)
    band_gap_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    library_matches: Mapped[dict | list | None] = mapped_column(JSON, nullable=True, default=list)
    
    linear_fit_r_squared: Mapped[float | None] = mapped_column(Float, nullable=True)

    __mapper_args__ = {
        "polymorphic_identity": "UVVIS",
    }
