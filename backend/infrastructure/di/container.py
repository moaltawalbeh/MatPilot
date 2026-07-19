
"""Dependency Injection Container.

Registers all platform services at application startup.
"""

from backend.infrastructure.config.settings import load_config, MatPilotConfig
from backend.infrastructure.logging.structured_logger import get_logger
from backend.infrastructure.storage.local_storage import LocalStorageProvider
from backend.infrastructure.storage.s3_storage import S3StorageProvider
from backend.infrastructure.storage.azure_storage import AzureStorageProvider
from backend.infrastructure.storage.gcs_storage import GCSStorageProvider
from backend.infrastructure.storage.storage_provider import IStorageProvider
from backend.infrastructure.database.sql_uow import InMemoryUnitOfWork
from backend.reference.engine.reference_engine import ReferenceEngine
from backend.reference.providers.cod_provider import CODProvider
from backend.reference.providers.materials_project_provider import MaterialsProjectProvider
from backend.reference.providers.oqmd_provider import OQMDProvider
from backend.reference.providers.aflow_provider import AFLOWProvider
from backend.reference.providers.nomad_provider import NOMADProvider
from backend.reference.providers.materials_cloud_provider import MaterialsCloudProvider
from backend.reference.providers.pubchem_provider import PubChemProvider
from backend.reference.providers.user_private_provider import UserPrivateProvider
from backend.reference.providers.org_private_provider import OrgPrivateProvider
from backend.reference.providers.local_cache_provider import LocalCacheProvider
from backend.reference.providers.local_cod_provider import LocalCODProvider
from backend.reference.providers.pubchem_provider import PubChemProvider
from backend.reference.providers.user_private_provider import UserPrivateProvider
from backend.reference.providers.org_private_provider import OrgPrivateProvider
from backend.parsers.parser_factory import ParserFactory
from backend.parsers.xy_parser import XYParser
from backend.parsers.xrdml_parser import XRDMLParser
from backend.parsers.raw_parser import RAWParser
from backend.parsers.cif_parser import CIFParser
from backend.services.upload_service import UploadService
from backend.services.job_manager import JobManager
from backend.services.pipeline import AnalysisPipeline
from backend.services.analysis_orchestrator import AnalysisOrchestrator
from backend.services.storage_service import StorageService
from backend.application.use_cases.upload_file import UploadFileUseCase
from backend.application.use_cases.submit_analysis import SubmitAnalysisUseCase
from backend.application.use_cases.get_analysis_result import GetAnalysisResultUseCase
from backend.application.use_cases.search_reference import SearchReferenceUseCase, GetProvidersUseCase
from backend.application.use_cases.generate_report import GenerateReportUseCase
from backend.application.use_cases.project import ProjectUseCase


class DIContainer:
    """Dependency Injection Container. Wires all platform services together."""

    def __init__(self):
        # Configuration
        self.config = load_config()
        self.logger = get_logger("di_container")

        # Storage Provider
        self.storage_provider = self._create_storage_provider()
        self.storage_service = StorageService(self.storage_provider)

        # Reference Engine (Sprint 6: with CIF cache + theoretical pattern generation)
        self.reference_engine = ReferenceEngine(
            cif_cache_dir=self.config.reference.cif_cache_dir,
            wavelength=self.config.reference.wavelength,
        )
        self._register_providers()

        # Parser Factory
        self.parser_factory = ParserFactory()
        self._register_parsers()

        # Upload Service
        self.upload_service = UploadService(
            parser_factory=self.parser_factory,
            temp_dir=self.config.upload.temp_folder
        )

        # Job Manager
        self.job_manager = JobManager()

        # Analysis Pipeline (uses reference engine for real searches)
        self.pipeline = AnalysisPipeline(reference_engine=self.reference_engine)

        # Analysis Orchestrator
        self.analysis_orchestrator = AnalysisOrchestrator(
            upload_service=self.upload_service,
            job_manager=self.job_manager,
            pipeline=self.pipeline,
            storage_provider=self.storage_provider,
            config=self.config
        )

        # Use Cases (exposed for API routers)
        self.uow = InMemoryUnitOfWork()
        self.upload_use_case = UploadFileUseCase(self.uow, self.parser_factory)
        self.submit_analysis_use_case = SubmitAnalysisUseCase(self.uow)
        self.get_analysis_result_use_case = GetAnalysisResultUseCase(self.uow)
        self.search_reference_use_case = SearchReferenceUseCase(self.reference_engine)
        self.get_providers_use_case = GetProvidersUseCase(self.reference_engine)
        self.generate_report_use_case = GenerateReportUseCase(self.uow)
        self.project_use_case = ProjectUseCase(self.uow)

        self.logger.info(
            "DI Container initialized",
            version=self.config.version,
            cif_cache_size=self.reference_engine.cif_cache.cache_size(),
        )

    def _create_storage_provider(self) -> IStorageProvider:
        backend = self.config.storage.backend
        if backend == "local":
            return LocalStorageProvider(self.config.storage.local_base_path)
        elif backend == "s3":
            return S3StorageProvider(
                bucket=self.config.storage.s3_bucket or "matpilot",
                region=self.config.storage.s3_region or "us-east-1"
            )
        elif backend == "azure":
            return AzureStorageProvider(
                container=self.config.storage.azure_container or "matpilot"
            )
        elif backend == "gcs":
            return GCSStorageProvider(
                bucket=self.config.storage.gcs_bucket or "matpilot"
            )
        else:
            self.logger.warning(f"Unknown storage backend {backend}, falling back to local")
            return LocalStorageProvider(self.config.storage.local_base_path)

    def _register_providers(self):
        self.reference_engine.register_provider(LocalCODProvider())
        self.reference_engine.register_provider(CODProvider(api_base_url=self.config.reference.cod_api_url))
        self.reference_engine.register_provider(MaterialsProjectProvider())
        self.reference_engine.register_provider(OQMDProvider())
        self.reference_engine.register_provider(AFLOWProvider())
        self.reference_engine.register_provider(NOMADProvider())
        self.reference_engine.register_provider(MaterialsCloudProvider())
        self.reference_engine.register_provider(PubChemProvider())
        self.reference_engine.register_provider(UserPrivateProvider())
        self.reference_engine.register_provider(OrgPrivateProvider())
        # Sprint 6: LocalCache backed by CIFCache for persistent CIF storage
        self.reference_engine.register_provider(LocalCacheProvider(cache_dir=self.config.reference.cif_cache_dir))

    def _register_parsers(self):
        self.parser_factory.register_parser(XYParser())
        self.parser_factory.register_parser(XRDMLParser())
        self.parser_factory.register_parser(RAWParser())
        self.parser_factory.register_parser(CIFParser())
