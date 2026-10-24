from fastapi import APIRouter, Request, HTTPException
from ..schemas.routes import (
    RouteRequest,
    RouteResponse,
    MapConfigResponse,
    SegmentsResponse,
)

router = APIRouter(prefix="/api", tags=["Geospatial & Routing"])


@router.get("/map/config", response_model=MapConfigResponse, summary="Map Configuration & Demo Presets")
async def get_map_config(request: Request) -> MapConfigResponse:
    """Returns demonstration bounding box, center coordinate, presets, and mobility profiles."""
    graph_service = request.app.state.graph_service
    return graph_service.get_map_config()


@router.get("/routes/segments", response_model=SegmentsResponse, summary="Pedestrian Segments GeoJSON Layer")
async def get_segments(request: Request) -> SegmentsResponse:
    """Returns all graph segments annotated with real accessibility attributes and barrier status."""
    graph_service = request.app.state.graph_service
    return graph_service.get_segments()


@router.post("/routes/shortest", response_model=RouteResponse, summary="Compute Shortest Pedestrian Route")
async def compute_shortest_route(payload: RouteRequest, request: Request) -> RouteResponse:
    """
    Computes true shortest pedestrian route using NetworkX Dijkstra algorithm on metric edge lengths.
    Snaps input coordinates to nearest graph nodes in the demonstration area.
    """
    graph_service = request.app.state.graph_service
    try:
        return graph_service.calculate_shortest_route(payload.start, payload.destination)
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal error computing shortest route: {str(e)}",
        )


@router.post("/routes/accessible", response_model=RouteResponse, summary="Compute Accessibility-Aware Route")
async def compute_accessible_route(payload: RouteRequest, request: Request) -> RouteResponse:
    """
    Computes accessibility-weighted pedestrian route using profile cost functions.
    Strictly avoids stairs and impassable curb cuts for wheelchair users.
    """
    graph_service = request.app.state.graph_service
    profile = payload.profile
    try:
        return graph_service.calculate_accessible_route(payload.start, payload.destination, profile)
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal error computing accessible route: {str(e)}",
        )
