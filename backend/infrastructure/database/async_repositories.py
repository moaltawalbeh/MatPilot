from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.domain.entities.analysis_job import AnalysisJob, AnalysisStatus, AnalysisType
from backend.domain.entities.analysis_result import AnalysisResult
from backend.domain.entities.collection import Collection, CollectionType
from backend.domain.entities.crystal_structure import CrystalStructure
from backend.domain.entities.download import Download, DownloadStatus, DownloadType
from backend.domain.entities.experiment import Experiment
from backend.domain.entities.measurement import Measurement, MeasurementStatus
from backend.domain.entities.notification import Notification, NotificationType
from backend.domain.entities.organization import Organization
from backend.domain.entities.project import Project
from backend.domain.entities.report import Report, ReportFormat
from backend.domain.entities.sample import Sample, SampleStatus, CrystalSystem
from backend.domain.entities.search_config import SearchConfig
from backend.domain.entities.activity import Activity, ActivityType
from backend.domain.entities.user import User, UserRole, UserStatus

from backend.infrastructure.database.models import (
    ActivityModel,
    AnalysisJobModel,
    AnalysisResultModel,
    CollectionModel,
    CrystalStructureModel,
    DownloadModel,
    ExperimentModel,
    MeasurementModel,
    NotificationModel,
    OrganizationModel,
    ProjectModel,
    ReportModel,
    SampleModel,
    SearchConfigModel,
    UserModel,
    TeamModel,
    TeamMemberModel,
)

from backend.domain.interfaces.repository import (
    IUserRepository,
    IProjectRepository,
    ISampleRepository,
    IMeasurementRepository,
    ICrystalStructureRepository,
    IExperimentRepository,
    IAnalysisJobRepository,
    IAnalysisResultRepository,
    IReportRepository,
    ICollectionRepository,
    IDownloadRepository,
    INotificationRepository,
    ISearchConfigRepository,
    IActivityRepository,
    IOrganizationRepository,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_model_to_entity(m: UserModel) -> User:
    return User(
        id=m.id,
        username=m.username,
        email=m.email,
        full_name=m.full_name,
        hashed_password=m.hashed_password,
        role=UserRole[m.role] if m.role and m.role in UserRole.__members__ else UserRole.RESEARCHER,
        status=UserStatus[m.status] if m.status and m.status in UserStatus.__members__ else UserStatus.ACTIVE,
        organization_id=m.organization_id,
        default_wavelength=m.default_wavelength,
        preferred_providers=m.preferred_providers if isinstance(m.preferred_providers, list) else [],
        language=m.language or "en",
        timezone=m.timezone or "UTC",
        avatar_url=m.avatar_url,
        last_login_at=m.last_login_at,
        login_count=m.login_count or 0,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


def _user_entity_to_model(e: User) -> UserModel:
    return UserModel(
        id=e.id,
        username=e.username,
        email=e.email,
        full_name=e.full_name,
        hashed_password=e.hashed_password or "",
        role=e.role.name,
        status=e.status.name,
        organization_id=e.organization_id,
        default_wavelength=e.default_wavelength,
        preferred_providers=e.preferred_providers,
        language=e.language,
        timezone=e.timezone,
        avatar_url=e.avatar_url,
        last_login_at=e.last_login_at,
        login_count=e.login_count,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


def _project_model_to_entity(m: ProjectModel) -> Project:
    return Project(
        id=m.id,
        name=m.name,
        description=m.description or "",
        material=m.material or "",
        owner_id=m.owner_id,
        status=m.status or "Active",
        tags=m.tags if isinstance(m.tags, list) else [],
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


def _project_entity_to_model(e: Project) -> ProjectModel:
    return ProjectModel(
        id=e.id,
        name=e.name,
        description=e.description,
        material=e.material,
        owner_id=e.owner_id,
        status=e.status,
        tags=e.tags,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


def _sample_model_to_entity(m: SampleModel) -> Sample:
    cs = None
    if m.crystal_system and m.crystal_system in [cs.value for cs in CrystalSystem]:
        cs = CrystalSystem(m.crystal_system)
    status = SampleStatus.DRAFT
    if m.status and m.status in SampleStatus.__members__:
        status = SampleStatus[m.status]
    return Sample(
        id=m.id,
        name=m.name,
        formula=m.formula or "",
        description=m.description or "",
        status=status,
        crystal_system=cs,
        tags=m.tags if isinstance(m.tags, list) else [],
        metadata=m.metadata_ if isinstance(m.metadata_, dict) else {},
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


def _sample_entity_to_model(e: Sample) -> SampleModel:
    return SampleModel(
        id=e.id,
        name=e.name,
        formula=e.formula,
        description=e.description,
        status=e.status.name,
        crystal_system=e.crystal_system.value if e.crystal_system else None,
        tags=e.tags,
        metadata_=e.metadata,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


def _measurement_model_to_entity(m: MeasurementModel) -> Measurement:
    status = MeasurementStatus.QUEUED
    if m.status and m.status in MeasurementStatus.__members__:
        status = MeasurementStatus[m.status]
    return Measurement(
        id=m.id,
        sample_id=m.sample_id,
        name=m.name,
        status=status,
        instrument=m.instrument if isinstance(m.instrument, dict) else {},
        scan=m.scan if isinstance(m.scan, dict) else {},
        data_points=m.data_points or 0,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


def _measurement_entity_to_model(e: Measurement) -> MeasurementModel:
    return MeasurementModel(
        id=e.id,
        sample_id=e.sample_id,
        name=e.name,
        status=e.status.name,
        instrument=e.instrument,
        scan=e.scan,
        data_points=e.data_points,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


def _crystal_structure_model_to_entity(m: CrystalStructureModel) -> CrystalStructure:
    return CrystalStructure(
        id=m.id,
        name=m.name,
        formula=m.formula or "",
        source=m.source or "",
        source_id=m.source_id,
        space_group=m.space_group,
        crystal_system=m.crystal_system,
        a=m.a,
        b=m.b,
        c=m.c,
        alpha=m.alpha,
        beta=m.beta,
        gamma=m.gamma,
        cif_text=m.cif_text,
        tags=m.tags if isinstance(m.tags, list) else [],
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


def _crystal_structure_entity_to_model(e: CrystalStructure) -> CrystalStructureModel:
    return CrystalStructureModel(
        id=e.id,
        name=e.name,
        formula=e.formula,
        source=e.source,
        source_id=e.source_id,
        space_group=e.space_group,
        crystal_system=e.crystal_system,
        a=e.a,
        b=e.b,
        c=e.c,
        alpha=e.alpha,
        beta=e.beta,
        gamma=e.gamma,
        cif_text=e.cif_text,
        peak_count=e.peak_count,
        tags=e.tags,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


def _experiment_model_to_entity(m: ExperimentModel) -> Experiment:
    return Experiment(
        id=m.id,
        project_id=m.project_id,
        name=m.name,
        status=m.status or "Created",
        data_points=m.data_points or 0,
        wavelength_angstrom=m.wavelength,
        two_theta_range=m.two_theta_range if isinstance(m.two_theta_range, list) else None,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


def _experiment_entity_to_model(e: Experiment) -> ExperimentModel:
    return ExperimentModel(
        id=e.id,
        project_id=e.project_id,
        name=e.name,
        status=e.status,
        uploaded_filename=None,
        wavelength=e.wavelength_angstrom,
        radiation=None,
        data_points=e.data_points,
        two_theta_range=e.two_theta_range,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


def _analysis_job_model_to_entity(m: AnalysisJobModel) -> AnalysisJob:
    atype = AnalysisType.PEAK_DETECTION
    if m.analysis_type and m.analysis_type in AnalysisType.__members__:
        atype = AnalysisType[m.analysis_type]
    status = AnalysisStatus.PENDING
    if m.status and m.status in AnalysisStatus.__members__:
        status = AnalysisStatus[m.status]
    return AnalysisJob(
        id=m.id,
        experiment_id=m.experiment_id,
        analysis_type=atype,
        status=status,
        parameters=m.parameters if isinstance(m.parameters, dict) else {},
        progress_percent=m.progress or 0.0,
        error_message=m.error_message,
        created_at=m.created_at,
    )


def _analysis_job_entity_to_model(e: AnalysisJob) -> AnalysisJobModel:
    return AnalysisJobModel(
        id=e.id,
        experiment_id=e.experiment_id,
        status=e.status.name,
        analysis_type=e.analysis_type.name,
        parameters=e.parameters,
        progress=e.progress_percent,
        error_message=e.error_message,
        created_at=e.created_at,
    )


def _analysis_result_model_to_entity(m: AnalysisResultModel) -> AnalysisResult:
    return AnalysisResult(
        id=m.id,
        job_id=m.job_id or UUID(int=0),
        analysis_type=AnalysisType.PEAK_DETECTION,
        created_at=m.created_at,
    )


def _analysis_result_entity_to_model(e: AnalysisResult) -> AnalysisResultModel:
    return AnalysisResultModel(
        id=e.id,
        job_id=e.job_id,
        result_type=e.analysis_type.name,
        result_data={},
        created_at=e.created_at,
    )


def _report_model_to_entity(m: ReportModel) -> Report:
    return Report(
        id=m.id,
        title=m.title,
        created_at=m.created_at,
    )


def _report_entity_to_model(e: Report) -> ReportModel:
    return ReportModel(
        id=e.id,
        title=e.title,
        report_type=e.format.name if hasattr(e, "format") else None,
        created_at=e.created_at,
    )


def _collection_model_to_entity(m: CollectionModel) -> Collection:
    ct = CollectionType.CUSTOM
    if m.collection_type and m.collection_type in CollectionType.__members__:
        ct = CollectionType[m.collection_type]
    return Collection(
        id=m.id,
        name=m.name,
        description=m.description or "",
        collection_type=ct,
        tags=m.tags if isinstance(m.tags, list) else [],
        is_public=m.is_public or False,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


def _collection_entity_to_model(e: Collection) -> CollectionModel:
    return CollectionModel(
        id=e.id,
        name=e.name,
        description=e.description,
        collection_type=e.collection_type.name,
        tags=e.tags,
        is_public=e.is_public,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


def _download_model_to_entity(m: DownloadModel) -> Download:
    status = DownloadStatus.PENDING
    if m.status and m.status in DownloadStatus.__members__:
        status = DownloadStatus[m.status]
    dtype = DownloadType.REPORT_PDF
    if m.download_type and m.download_type in DownloadType.__members__:
        dtype = DownloadType[m.download_type]
    return Download(
        id=m.id,
        download_type=dtype,
        status=status,
        source_type=m.source_type or "",
        source_id=m.source_id,
        experiment_id=m.experiment_id,
        file_path=m.file_path or "",
        created_at=m.created_at,
    )


def _download_entity_to_model(e: Download) -> DownloadModel:
    return DownloadModel(
        id=e.id,
        download_type=e.download_type.name,
        source_type=e.source_type,
        source_id=e.source_id,
        experiment_id=e.experiment_id,
        status=e.status.name,
        file_path=e.file_path,
        created_at=e.created_at,
    )


def _notification_model_to_entity(m: NotificationModel) -> Notification:
    ntype = NotificationType.SYSTEM_ALERT
    if m.notification_type and m.notification_type in NotificationType.__members__:
        ntype = NotificationType[m.notification_type]
    return Notification(
        id=m.id,
        user_id=m.user_id,
        title=m.title,
        message=m.message or "",
        notification_type=ntype,
        is_read=m.is_read or False,
        created_at=m.created_at,
    )


def _notification_entity_to_model(e: Notification) -> NotificationModel:
    return NotificationModel(
        id=e.id,
        user_id=e.user_id,
        title=e.title,
        message=e.message,
        notification_type=e.notification_type.name,
        is_read=e.is_read,
        created_at=e.created_at,
    )


def _search_config_model_to_entity(m: SearchConfigModel) -> SearchConfig:
    return SearchConfig(
        id=m.id,
        name=m.name,
        description=m.description or "",
        search_type=m.search_type or "phase_identification",
        query=m.query_text or "",
        elements=m.elements if isinstance(m.elements, list) else [],
        providers=m.providers if isinstance(m.providers, list) else [],
        max_results=m.max_results or 50,
        created_at=m.created_at,
    )


def _search_config_entity_to_model(e: SearchConfig) -> SearchConfigModel:
    return SearchConfigModel(
        id=e.id,
        name=e.name,
        description=e.description,
        search_type=e.search_type,
        query_text=e.query,
        elements=e.elements,
        providers=e.providers,
        max_results=e.max_results,
        created_at=e.created_at,
    )


def _activity_model_to_entity(m: ActivityModel) -> Activity:
    return Activity(
        id=m.id,
        user_id=m.user_id,
        action=m.action,
        source_type=m.entity_type or "",
        source_id=m.entity_id,
        metadata=m.details if isinstance(m.details, dict) else {},
        created_at=m.created_at,
    )


def _activity_entity_to_model(e: Activity) -> ActivityModel:
    return ActivityModel(
        id=e.id,
        user_id=e.user_id,
        action=e.action,
        entity_type=e.source_type,
        entity_id=e.source_id,
        details=e.metadata,
        created_at=e.created_at,
    )


def _organization_model_to_entity(m: OrganizationModel) -> Organization:
    return Organization(
        id=m.id,
        name=m.name,
        description=m.description or "",
        settings=m.settings if isinstance(m.settings, dict) else {},
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


def _organization_entity_to_model(e: Organization) -> OrganizationModel:
    return OrganizationModel(
        id=e.id,
        name=e.name,
        description=e.description,
        settings=e.settings,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


# ---------------------------------------------------------------------------
# Repositories
# ---------------------------------------------------------------------------

class AsyncUserRepository(IUserRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[User]:
        result = await self._session.execute(select(UserModel).where(UserModel.id == id))
        m = result.scalar_one_or_none()
        return _user_model_to_entity(m) if m else None

    async def get_all(self) -> List[User]:
        result = await self._session.execute(select(UserModel).order_by(UserModel.created_at.desc()))
        return [_user_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: User) -> User:
        m = _user_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: User) -> User:
        values = {}
        for col in UserModel.__table__.columns:
            key = col.name
            if hasattr(entity, key):
                val = getattr(entity, key)
                if isinstance(val, Enum):
                    val = val.name
                values[key] = val
            elif key == "metadata_" and hasattr(entity, "metadata"):
                values[key] = entity.metadata
        values["updated_at"] = datetime.utcnow()
        stmt = update(UserModel).where(UserModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(UserModel).where(UserModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self._session.execute(select(UserModel).where(UserModel.email == email))
        m = result.scalar_one_or_none()
        return _user_model_to_entity(m) if m else None

    async def get_by_username(self, username: str) -> Optional[User]:
        result = await self._session.execute(select(UserModel).where(UserModel.username == username))
        m = result.scalar_one_or_none()
        return _user_model_to_entity(m) if m else None

    async def get_by_organization(self, org_id: UUID) -> List[User]:
        result = await self._session.execute(
            select(UserModel).where(UserModel.organization_id == org_id)
        )
        return [_user_model_to_entity(m) for m in result.scalars().all()]


class AsyncProjectRepository(IProjectRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[Project]:
        result = await self._session.execute(select(ProjectModel).where(ProjectModel.id == id))
        m = result.scalar_one_or_none()
        return _project_model_to_entity(m) if m else None

    async def get_all(self) -> List[Project]:
        result = await self._session.execute(select(ProjectModel).order_by(ProjectModel.created_at.desc()))
        return [_project_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: Project) -> Project:
        m = _project_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: Project) -> Project:
        values = {c.name: getattr(entity, c.name, None) for c in ProjectModel.__table__.columns}
        values.pop("id", None)
        values["updated_at"] = datetime.utcnow()
        stmt = update(ProjectModel).where(ProjectModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(ProjectModel).where(ProjectModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_owner(self, owner_id: str) -> List[Project]:
        result = await self._session.execute(
            select(ProjectModel).where(ProjectModel.owner_id == owner_id)
        )
        return [_project_model_to_entity(m) for m in result.scalars().all()]

    async def get_by_status(self, status: str) -> List[Project]:
        result = await self._session.execute(
            select(ProjectModel).where(ProjectModel.status == status)
        )
        return [_project_model_to_entity(m) for m in result.scalars().all()]


class AsyncSampleRepository(ISampleRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[Sample]:
        result = await self._session.execute(select(SampleModel).where(SampleModel.id == id))
        m = result.scalar_one_or_none()
        return _sample_model_to_entity(m) if m else None

    async def get_all(self) -> List[Sample]:
        result = await self._session.execute(select(SampleModel).order_by(SampleModel.created_at.desc()))
        return [_sample_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: Sample) -> Sample:
        m = _sample_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: Sample) -> Sample:
        values = {c.name: getattr(entity, c.name, None) for c in SampleModel.__table__.columns if c.name != "metadata"}
        values["metadata"] = entity.metadata
        values.pop("id", None)
        values["updated_at"] = datetime.utcnow()
        stmt = update(SampleModel).where(SampleModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(SampleModel).where(SampleModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_owner(self, owner_id: UUID) -> List[Sample]:
        result = await self._session.execute(
            select(SampleModel).where(SampleModel.project_id == owner_id)
        )
        return [_sample_model_to_entity(m) for m in result.scalars().all()]

    async def get_by_status(self, status: str) -> List[Sample]:
        result = await self._session.execute(
            select(SampleModel).where(SampleModel.status == status)
        )
        return [_sample_model_to_entity(m) for m in result.scalars().all()]

    async def search(self, query: str, tags: Optional[List[str]] = None) -> List[Sample]:
        stmt = select(SampleModel).where(SampleModel.name.ilike(f"%{query}%"))
        if tags:
            for tag in tags:
                stmt = stmt.where(SampleModel.tags.astext.contains(tag))
        result = await self._session.execute(stmt)
        return [_sample_model_to_entity(m) for m in result.scalars().all()]


class AsyncMeasurementRepository(IMeasurementRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[Measurement]:
        result = await self._session.execute(select(MeasurementModel).where(MeasurementModel.id == id))
        m = result.scalar_one_or_none()
        return _measurement_model_to_entity(m) if m else None

    async def get_all(self) -> List[Measurement]:
        result = await self._session.execute(select(MeasurementModel).order_by(MeasurementModel.created_at.desc()))
        return [_measurement_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: Measurement) -> Measurement:
        m = _measurement_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: Measurement) -> Measurement:
        values = {c.name: getattr(entity, c.name, None) for c in MeasurementModel.__table__.columns}
        values.pop("id", None)
        values["updated_at"] = datetime.utcnow()
        stmt = update(MeasurementModel).where(MeasurementModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(MeasurementModel).where(MeasurementModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_sample(self, sample_id: UUID) -> List[Measurement]:
        result = await self._session.execute(
            select(MeasurementModel).where(MeasurementModel.sample_id == sample_id)
        )
        return [_measurement_model_to_entity(m) for m in result.scalars().all()]

    async def get_by_status(self, status: str) -> List[Measurement]:
        result = await self._session.execute(
            select(MeasurementModel).where(MeasurementModel.status == status)
        )
        return [_measurement_model_to_entity(m) for m in result.scalars().all()]

    async def get_by_experiment(self, experiment_id: UUID) -> Optional[Measurement]:
        result = await self._session.execute(
            select(MeasurementModel).where(MeasurementModel.id == experiment_id)
        )
        m = result.scalar_one_or_none()
        return _measurement_model_to_entity(m) if m else None


class AsyncCrystalStructureRepository(ICrystalStructureRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[CrystalStructure]:
        result = await self._session.execute(
            select(CrystalStructureModel).where(CrystalStructureModel.id == id)
        )
        m = result.scalar_one_or_none()
        return _crystal_structure_model_to_entity(m) if m else None

    async def get_all(self) -> List[CrystalStructure]:
        result = await self._session.execute(
            select(CrystalStructureModel).order_by(CrystalStructureModel.created_at.desc())
        )
        return [_crystal_structure_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: CrystalStructure) -> CrystalStructure:
        m = _crystal_structure_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: CrystalStructure) -> CrystalStructure:
        values = {c.name: getattr(entity, c.name, None) for c in CrystalStructureModel.__table__.columns}
        values.pop("id", None)
        values["updated_at"] = datetime.utcnow()
        stmt = update(CrystalStructureModel).where(CrystalStructureModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(CrystalStructureModel).where(CrystalStructureModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_source(self, source: str, source_id: str) -> Optional[CrystalStructure]:
        result = await self._session.execute(
            select(CrystalStructureModel).where(
                CrystalStructureModel.source == source,
                CrystalStructureModel.source_id == source_id,
            )
        )
        m = result.scalar_one_or_none()
        return _crystal_structure_model_to_entity(m) if m else None

    async def search_by_formula(self, formula: str) -> List[CrystalStructure]:
        result = await self._session.execute(
            select(CrystalStructureModel).where(
                CrystalStructureModel.formula.ilike(f"%{formula}%")
            )
        )
        return [_crystal_structure_model_to_entity(m) for m in result.scalars().all()]

    async def search_by_space_group(self, space_group: str) -> List[CrystalStructure]:
        result = await self._session.execute(
            select(CrystalStructureModel).where(
                CrystalStructureModel.space_group == space_group
            )
        )
        return [_crystal_structure_model_to_entity(m) for m in result.scalars().all()]


class AsyncExperimentRepository(IExperimentRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[Experiment]:
        result = await self._session.execute(select(ExperimentModel).where(ExperimentModel.id == id))
        m = result.scalar_one_or_none()
        return _experiment_model_to_entity(m) if m else None

    async def get_all(self) -> List[Experiment]:
        result = await self._session.execute(
            select(ExperimentModel).order_by(ExperimentModel.created_at.desc())
        )
        return [_experiment_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: Experiment) -> Experiment:
        m = _experiment_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: Experiment) -> Experiment:
        values = {c.name: getattr(entity, c.name, None) for c in ExperimentModel.__table__.columns}
        values.pop("id", None)
        values["updated_at"] = datetime.utcnow()
        stmt = update(ExperimentModel).where(ExperimentModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(ExperimentModel).where(ExperimentModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_name(self, name: str) -> List[Experiment]:
        result = await self._session.execute(
            select(ExperimentModel).where(ExperimentModel.name.ilike(f"%{name}%"))
        )
        return [_experiment_model_to_entity(m) for m in result.scalars().all()]

    async def get_by_dataset(self, dataset_id: UUID) -> List[Experiment]:
        result = await self._session.execute(
            select(ExperimentModel).where(ExperimentModel.project_id == dataset_id)
        )
        return [_experiment_model_to_entity(m) for m in result.scalars().all()]


class AsyncAnalysisJobRepository(IAnalysisJobRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[AnalysisJob]:
        result = await self._session.execute(select(AnalysisJobModel).where(AnalysisJobModel.id == id))
        m = result.scalar_one_or_none()
        return _analysis_job_model_to_entity(m) if m else None

    async def get_all(self) -> List[AnalysisJob]:
        result = await self._session.execute(
            select(AnalysisJobModel).order_by(AnalysisJobModel.created_at.desc())
        )
        return [_analysis_job_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: AnalysisJob) -> AnalysisJob:
        m = _analysis_job_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: AnalysisJob) -> AnalysisJob:
        values = {c.name: getattr(entity, c.name, None) for c in AnalysisJobModel.__table__.columns}
        values.pop("id", None)
        values["updated_at"] = datetime.utcnow()
        stmt = update(AnalysisJobModel).where(AnalysisJobModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(AnalysisJobModel).where(AnalysisJobModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_status(self, status: str) -> List[AnalysisJob]:
        result = await self._session.execute(
            select(AnalysisJobModel).where(AnalysisJobModel.status == status)
        )
        return [_analysis_job_model_to_entity(m) for m in result.scalars().all()]

    async def get_by_experiment(self, experiment_id: UUID) -> List[AnalysisJob]:
        result = await self._session.execute(
            select(AnalysisJobModel).where(AnalysisJobModel.experiment_id == experiment_id)
        )
        return [_analysis_job_model_to_entity(m) for m in result.scalars().all()]


class AsyncAnalysisResultRepository(IAnalysisResultRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[AnalysisResult]:
        result = await self._session.execute(
            select(AnalysisResultModel).where(AnalysisResultModel.id == id)
        )
        m = result.scalar_one_or_none()
        return _analysis_result_model_to_entity(m) if m else None

    async def get_all(self) -> List[AnalysisResult]:
        result = await self._session.execute(
            select(AnalysisResultModel).order_by(AnalysisResultModel.created_at.desc())
        )
        return [_analysis_result_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: AnalysisResult) -> AnalysisResult:
        m = _analysis_result_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: AnalysisResult) -> AnalysisResult:
        values = {c.name: getattr(entity, c.name, None) for c in AnalysisResultModel.__table__.columns}
        values.pop("id", None)
        stmt = update(AnalysisResultModel).where(AnalysisResultModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(AnalysisResultModel).where(AnalysisResultModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_job(self, job_id: UUID) -> Optional[AnalysisResult]:
        result = await self._session.execute(
            select(AnalysisResultModel).where(AnalysisResultModel.job_id == job_id)
        )
        m = result.scalar_one_or_none()
        return _analysis_result_model_to_entity(m) if m else None


class AsyncReportRepository(IReportRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[Report]:
        result = await self._session.execute(select(ReportModel).where(ReportModel.id == id))
        m = result.scalar_one_or_none()
        return _report_model_to_entity(m) if m else None

    async def get_all(self) -> List[Report]:
        result = await self._session.execute(
            select(ReportModel).order_by(ReportModel.created_at.desc())
        )
        return [_report_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: Report) -> Report:
        m = _report_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: Report) -> Report:
        values = {c.name: getattr(entity, c.name, None) for c in ReportModel.__table__.columns}
        values.pop("id", None)
        stmt = update(ReportModel).where(ReportModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(ReportModel).where(ReportModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0


class AsyncCollectionRepository(ICollectionRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[Collection]:
        result = await self._session.execute(select(CollectionModel).where(CollectionModel.id == id))
        m = result.scalar_one_or_none()
        return _collection_model_to_entity(m) if m else None

    async def get_all(self) -> List[Collection]:
        result = await self._session.execute(
            select(CollectionModel).order_by(CollectionModel.created_at.desc())
        )
        return [_collection_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: Collection) -> Collection:
        m = _collection_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: Collection) -> Collection:
        values = {c.name: getattr(entity, c.name, None) for c in CollectionModel.__table__.columns}
        values.pop("id", None)
        values["updated_at"] = datetime.utcnow()
        stmt = update(CollectionModel).where(CollectionModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(CollectionModel).where(CollectionModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_owner(self, owner_id: UUID) -> List[Collection]:
        result = await self._session.execute(
            select(CollectionModel).where(CollectionModel.id == owner_id)
        )
        return [_collection_model_to_entity(m) for m in result.scalars().all()]

    async def get_by_type(self, collection_type: str) -> List[Collection]:
        result = await self._session.execute(
            select(CollectionModel).where(CollectionModel.collection_type == collection_type)
        )
        return [_collection_model_to_entity(m) for m in result.scalars().all()]


class AsyncDownloadRepository(IDownloadRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[Download]:
        result = await self._session.execute(select(DownloadModel).where(DownloadModel.id == id))
        m = result.scalar_one_or_none()
        return _download_model_to_entity(m) if m else None

    async def get_all(self) -> List[Download]:
        result = await self._session.execute(
            select(DownloadModel).order_by(DownloadModel.created_at.desc())
        )
        return [_download_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: Download) -> Download:
        m = _download_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: Download) -> Download:
        values = {c.name: getattr(entity, c.name, None) for c in DownloadModel.__table__.columns}
        values.pop("id", None)
        stmt = update(DownloadModel).where(DownloadModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(DownloadModel).where(DownloadModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_user(self, user_id: UUID) -> List[Download]:
        result = await self._session.execute(
            select(DownloadModel).where(DownloadModel.id == user_id)
        )
        return [_download_model_to_entity(m) for m in result.scalars().all()]

    async def get_by_status(self, status: str) -> List[Download]:
        result = await self._session.execute(
            select(DownloadModel).where(DownloadModel.status == status)
        )
        return [_download_model_to_entity(m) for m in result.scalars().all()]

    async def get_pending(self) -> List[Download]:
        result = await self._session.execute(
            select(DownloadModel).where(DownloadModel.status == "PENDING")
        )
        return [_download_model_to_entity(m) for m in result.scalars().all()]


class AsyncNotificationRepository(INotificationRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[Notification]:
        result = await self._session.execute(
            select(NotificationModel).where(NotificationModel.id == id)
        )
        m = result.scalar_one_or_none()
        return _notification_model_to_entity(m) if m else None

    async def get_all(self) -> List[Notification]:
        result = await self._session.execute(
            select(NotificationModel).order_by(NotificationModel.created_at.desc())
        )
        return [_notification_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: Notification) -> Notification:
        m = _notification_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: Notification) -> Notification:
        values = {c.name: getattr(entity, c.name, None) for c in NotificationModel.__table__.columns}
        values.pop("id", None)
        stmt = update(NotificationModel).where(NotificationModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(NotificationModel).where(NotificationModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_user(self, user_id: UUID, unread_only: bool = False) -> List[Notification]:
        stmt = select(NotificationModel).where(NotificationModel.user_id == user_id)
        if unread_only:
            stmt = stmt.where(NotificationModel.is_read == False)
        stmt = stmt.order_by(NotificationModel.created_at.desc())
        result = await self._session.execute(stmt)
        return [_notification_model_to_entity(m) for m in result.scalars().all()]

    async def get_unread_count(self, user_id: UUID) -> int:
        result = await self._session.execute(
            select(NotificationModel).where(
                NotificationModel.user_id == user_id,
                NotificationModel.is_read == False,
            )
        )
        return len(result.scalars().all())

    async def mark_all_read(self, user_id: UUID) -> int:
        stmt = (
            update(NotificationModel)
            .where(NotificationModel.user_id == user_id, NotificationModel.is_read == False)
            .values(is_read=True)
        )
        result = await self._session.execute(stmt)
        return result.rowcount


class AsyncSearchConfigRepository(ISearchConfigRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[SearchConfig]:
        result = await self._session.execute(
            select(SearchConfigModel).where(SearchConfigModel.id == id)
        )
        m = result.scalar_one_or_none()
        return _search_config_model_to_entity(m) if m else None

    async def get_all(self) -> List[SearchConfig]:
        result = await self._session.execute(
            select(SearchConfigModel).order_by(SearchConfigModel.created_at.desc())
        )
        return [_search_config_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: SearchConfig) -> SearchConfig:
        m = _search_config_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: SearchConfig) -> SearchConfig:
        values = {c.name: getattr(entity, c.name, None) for c in SearchConfigModel.__table__.columns}
        values.pop("id", None)
        values["updated_at"] = datetime.utcnow()
        stmt = update(SearchConfigModel).where(SearchConfigModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(SearchConfigModel).where(SearchConfigModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_owner(self, owner_id: UUID) -> List[SearchConfig]:
        result = await self._session.execute(
            select(SearchConfigModel).where(SearchConfigModel.id == owner_id)
        )
        return [_search_config_model_to_entity(m) for m in result.scalars().all()]

    async def get_by_type(self, search_type: str) -> List[SearchConfig]:
        result = await self._session.execute(
            select(SearchConfigModel).where(SearchConfigModel.search_type == search_type)
        )
        return [_search_config_model_to_entity(m) for m in result.scalars().all()]

    async def get_popular(self, limit: int = 10) -> List[SearchConfig]:
        result = await self._session.execute(
            select(SearchConfigModel).order_by(SearchConfigModel.created_at.desc()).limit(limit)
        )
        return [_search_config_model_to_entity(m) for m in result.scalars().all()]


class AsyncActivityRepository(IActivityRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[Activity]:
        result = await self._session.execute(select(ActivityModel).where(ActivityModel.id == id))
        m = result.scalar_one_or_none()
        return _activity_model_to_entity(m) if m else None

    async def get_all(self) -> List[Activity]:
        result = await self._session.execute(
            select(ActivityModel).order_by(ActivityModel.created_at.desc())
        )
        return [_activity_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: Activity) -> Activity:
        m = _activity_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: Activity) -> Activity:
        values = {c.name: getattr(entity, c.name, None) for c in ActivityModel.__table__.columns}
        values.pop("id", None)
        stmt = update(ActivityModel).where(ActivityModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(ActivityModel).where(ActivityModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_user(self, user_id: UUID, limit: int = 50) -> List[Activity]:
        result = await self._session.execute(
            select(ActivityModel)
            .where(ActivityModel.user_id == user_id)
            .order_by(ActivityModel.created_at.desc())
            .limit(limit)
        )
        return [_activity_model_to_entity(m) for m in result.scalars().all()]

    async def get_by_project(self, project_id: UUID, limit: int = 50) -> List[Activity]:
        result = await self._session.execute(
            select(ActivityModel)
            .where(ActivityModel.entity_id == project_id)
            .order_by(ActivityModel.created_at.desc())
            .limit(limit)
        )
        return [_activity_model_to_entity(m) for m in result.scalars().all()]

    async def get_recent(self, limit: int = 100) -> List[Activity]:
        result = await self._session.execute(
            select(ActivityModel).order_by(ActivityModel.created_at.desc()).limit(limit)
        )
        return [_activity_model_to_entity(m) for m in result.scalars().all()]


class AsyncOrganizationRepository(IOrganizationRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, id: UUID) -> Optional[Organization]:
        result = await self._session.execute(
            select(OrganizationModel).where(OrganizationModel.id == id)
        )
        m = result.scalar_one_or_none()
        return _organization_model_to_entity(m) if m else None

    async def get_all(self) -> List[Organization]:
        result = await self._session.execute(
            select(OrganizationModel).order_by(OrganizationModel.created_at.desc())
        )
        return [_organization_model_to_entity(m) for m in result.scalars().all()]

    async def add(self, entity: Organization) -> Organization:
        m = _organization_entity_to_model(entity)
        self._session.add(m)
        await self._session.flush()
        entity.id = m.id
        return entity

    async def update(self, entity: Organization) -> Organization:
        values = {c.name: getattr(entity, c.name, None) for c in OrganizationModel.__table__.columns}
        values.pop("id", None)
        values["updated_at"] = datetime.utcnow()
        stmt = update(OrganizationModel).where(OrganizationModel.id == entity.id).values(**values)
        await self._session.execute(stmt)
        return entity

    async def delete(self, id: UUID) -> bool:
        stmt = delete(OrganizationModel).where(OrganizationModel.id == id)
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def get_by_slug(self, slug: str) -> Optional[Organization]:
        result = await self._session.execute(
            select(OrganizationModel).where(OrganizationModel.name == slug)
        )
        m = result.scalar_one_or_none()
        return _organization_model_to_entity(m) if m else None

    async def get_by_owner(self, owner_id: UUID) -> List[Organization]:
        result = await self._session.execute(
            select(OrganizationModel).where(OrganizationModel.id == owner_id)
        )
        return [_organization_model_to_entity(m) for m in result.scalars().all()]
