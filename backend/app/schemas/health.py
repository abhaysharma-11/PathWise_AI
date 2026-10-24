from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel, Field


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class HealthResponse(BaseModel):
    """Health check response schema according to Phase 1 specification."""
    status: str = Field(default="ok", description="Service health state")
    service: str = Field(default="PATHWISE AI", description="Service identifier name")
    phase: int = Field(default=1, description="Current development phase")
    version: str = Field(default="0.1.0", description="Semantic service version")
    timestamp: datetime = Field(default_factory=get_utc_now, description="Server UTC timestamp")
    tagline: str = Field(default="Beyond Shortest. Towards Safest.", description="Platform tagline")
    environment: str = Field(default="development", description="Current execution environment")
    uptime_seconds: float = Field(default=0.0, description="Process running duration in seconds")


class FeatureStatus(BaseModel):
    """Status summary of platform functional modules."""
    name: str
    phase: int
    status: str
    description: str


class SystemDiagnosticsResponse(BaseModel):
    """Detailed diagnostics returned for platform telemetry in Phase 1."""
    service: str
    phase: int
    status: str
    api_version: str
    server_time: datetime
    uptime_seconds: float
    python_version: str
    cors_allowed_origins: List[str]
    modules: List[FeatureStatus]
