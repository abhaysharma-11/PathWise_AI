from fastapi import APIRouter, Request
from ..schemas.health import HealthResponse, SystemDiagnosticsResponse

router = APIRouter(prefix="/api", tags=["Health & System"])


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
async def get_health(request: Request) -> HealthResponse:
    """
    Returns platform health state, service name, and current phase indicator.
    
    Response schema includes:
    - status: 'ok'
    - service: 'PATHWISE AI'
    - phase: 1
    """
    health_service = request.app.state.health_service
    return health_service.get_health()


@router.get("/diagnostics", response_model=SystemDiagnosticsResponse, summary="System Diagnostics")
async def get_diagnostics(request: Request) -> SystemDiagnosticsResponse:
    """Returns detailed runtime metadata, uptime, and module readiness status."""
    health_service = request.app.state.health_service
    return health_service.get_diagnostics()
