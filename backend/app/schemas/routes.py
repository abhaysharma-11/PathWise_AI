from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RouteProfile(str, Enum):
    general_pedestrian = "general_pedestrian"
    wheelchair = "wheelchair"
    blind_low_vision = "blind_low_vision"
    elderly = "elderly"


class Coordinate(BaseModel):
    lat: float = Field(..., description="Latitude in decimal degrees", ge=-90.0, le=90.0)
    lon: float = Field(..., description="Longitude in decimal degrees", ge=-180.0, le=180.0)
    name: Optional[str] = Field(default=None, description="Optional landmark name")


class AccessibilityBarrier(BaseModel):
    id: str
    type: str = Field(..., description="Barrier category: stairs, missing_curb_cut, steep_incline, uneven_surface")
    description: str
    location: Coordinate
    severity: str = Field(..., description="Severity level: low, medium, high, critical")
    prohibits_wheelchair: bool = Field(default=False)


class RouteConfidence(BaseModel):
    score: int = Field(..., description="Confidence score from 0 to 100", ge=0, le=100)
    level: str = Field(..., description="'High Evidence', 'Moderate Evidence', or 'Limited Evidence'")
    imagery_coverage_pct: float = Field(..., description="Length-weighted percentage of route with recent imagery (< 90 days)")
    verified_coverage_pct: float = Field(..., description="Length-weighted percentage of route with ground verified attributes")
    segments_with_imagery: int
    segments_without_imagery: int
    total_segments: int
    oldest_imagery_days: Optional[int] = None
    formula_explanation: str
    disclaimer: str = "Confidence reflects available accessibility evidence, not a guarantee of physical safety."


class SegmentFeature(BaseModel):
    id: str
    u: str
    v: str
    coordinates: List[List[float]] = Field(..., description="Ordered list of [lat, lon] points")
    length_meters: float
    highway: str
    surface: str
    is_verified: bool = Field(..., description="Whether surface is verified on-the-ground or unverified")
    curb_ramp: str = Field(..., description="'yes', 'no', or 'unverified'")
    has_stairs: bool
    incline_pct: float
    tactile_paving: bool
    barrier: Optional[str] = None
    last_imagery_date: Optional[str] = Field(default=None, description="ISO date of newest street imagery")
    data_source: str = Field(default="demo_annotated_fixture", description="'osm_real' or 'demo_annotated_fixture'")


class RouteRequest(BaseModel):
    start: Coordinate
    destination: Coordinate
    profile: Optional[RouteProfile] = Field(
        default=RouteProfile.general_pedestrian,
        description="Mobility profile for cost function calculation"
    )


class RouteResponse(BaseModel):
    success: bool = True
    route_type: str = Field(..., description="'shortest' or 'accessible'")
    profile: str
    distance_meters: float
    estimated_duration_minutes: float
    coordinates: List[List[float]] = Field(..., description="Ordered list of [lat, lon] waypoints")
    node_ids: List[str]
    segments_count: int
    barriers_encountered: List[AccessibilityBarrier] = []
    barriers_avoided: List[AccessibilityBarrier] = []
    unverified_segments_count: int = 0
    confidence: Optional[RouteConfidence] = None
    explanation: str
    is_identical_to_shortest: Optional[bool] = False
    warning_message: Optional[str] = None


class DemoScenario(BaseModel):
    id: str
    title: str
    description: str
    start: Coordinate
    destination: Coordinate
    expected_shortest_barrier: str
    expected_accessible_solution: str


class MapConfigResponse(BaseModel):
    center: Coordinate
    default_zoom: int
    bounding_box: Dict[str, float]
    area_name: str
    city: str
    state: str
    country: str
    description: str
    demo_scenarios: List[DemoScenario]
    available_profiles: List[Dict[str, Any]]
    disclaimer: str


class SegmentsResponse(BaseModel):
    demonstration_area: str
    total_segments: int
    segments: List[SegmentFeature]
