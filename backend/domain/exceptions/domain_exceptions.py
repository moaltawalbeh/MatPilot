
"""Domain-specific exceptions."""


class MatPilotException(Exception):
    """Base exception for all MatPilot errors."""
    pass


class ValidationError(MatPilotException):
    """Raised when domain validation fails."""
    pass


class InvalidFileException(MatPilotException):
    """Raised when a file fails validation."""
    pass


class UnsupportedFormatException(MatPilotException):
    """Raised when an unsupported file format is encountered."""
    pass


class ParserException(MatPilotException):
    """Raised when file parsing fails."""
    pass


class EntityNotFoundError(MatPilotException):
    """Raised when a requested entity does not exist."""
    pass


class DuplicateEntityError(MatPilotException):
    """Raised when attempting to create a duplicate entity."""
    pass


class AnalysisException(MatPilotException):
    """Raised when analysis execution fails."""
    pass


class ProviderException(MatPilotException):
    """Raised when a reference provider fails."""
    pass


class ProviderNotAvailableError(ProviderException):
    """Raised when a requested provider is not available."""
    pass


class StorageException(MatPilotException):
    """Raised when storage operations fail."""
    pass


class ReportGenerationError(MatPilotException):
    """Raised when report generation fails."""
    pass
