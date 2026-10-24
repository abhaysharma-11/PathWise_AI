import sys
import time
from datetime import datetime, timezone
from typing import List
from ..schemas.health import HealthResponse, SystemDiagnosticsResponse, FeatureStatus


class HealthService:
    """Service providing health metrics and system readiness data."""

    def __init__(self, start_time: float, environment: str = "development", allowed_origins: List[str] = None):
        self._start_time = start_time
        self.environment = environment
        self.allowed_origins = allowed_origins or []

    @property
    def uptime_seconds(self) -> float:
        return round(time.time() - self._start_time, 2)

    def get_health(self) -> HealthResponse:
        """Returns standard Phase 3 health status."""
        return HealthResponse(
            status="ok",
            service="PATHWISE AI",
            phase=2,
            version="0.2.0",
            timestamp=datetime.now(timezone.utc),
            tagline="Beyond Shortest. Towards Safest.",
            environment=self.environment,
            uptime_seconds=self.uptime_seconds,
        )

    def get_diagnostics(self) -> SystemDiagnosticsResponse:
        """Returns full diagnostics including roadmap modules."""
        modules = [
            FeatureStatus(
                name="StreetVision AI & Hazard Detection",
                phase=3,
                status="Active",
                description="Computer vision detection for transient obstructions, parked vehicles, and manual accessibility barrier annotation.",
            ),
            FeatureStatus(
                name="Pedestrian Micro-Routing Engine",
                phase=2,
                status="Active",
                description="NetworkX graph routing with accessibility cost functions (wheelchair, elderly, pedestrian) and dynamic barrier overlay.",
            ),
            FeatureStatus(
                name="Interactive Leaflet & OSM Map Canvas",
                phase=2,
                status="Active",
                description="Interactive Leaflet mapping with shortest (cyan) and accessible (emerald) comparative routing.",
            ),
            FeatureStatus(
                name="Core FastAPI Geointelligence Gateway",
                phase=1,
                status="Active",
                description="High-performance async REST API with CORS validation and typed schemas.",
            ),
        ]

        return SystemDiagnosticsResponse(
            service="PATHWISE AI",
            phase=2,
            status="operational",
            api_version="0.2.0",
            server_time=datetime.now(timezone.utc),
            uptime_seconds=self.uptime_seconds,
            python_version=sys.version.split(" ")[0],
            cors_allowed_origins=self.allowed_origins,
            modules=modules,
        )
