from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from .routes import Coordinate


class BarrierCategory(str, Enum):
    stairs = "stairs"
    missing_curb_ramp = "missing_curb_ramp"
    broken_footpath = "broken_footpath"
    missing_footpath = "missing_footpath"
    pole_obstruction = "pole_obstruction"
    parked_vehicle_blocking_footpath = "parked_vehicle_blocking_footpath"
    uneven_surface = "uneven_surface"


class DetectionSource(str, Enum):
    ai_detected = "ai_detected"
    human_confirmed = "human_confirmed"
    manually_annotated = "manually_annotated"


class VerificationStatus(str, Enum):
    ai_suggested = "ai_suggested"
    human_verified = "human_verified"
    rejected = "rejected"


class BarrierType(str, Enum):
    temporary = "temporary"
    persistent = "persistent"


class VisionDetection(BaseModel):
    id: str = Field(..., description="Unique detection identifier")
    label: str = Field(..., description="Raw detected class or barrier category")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0", ge=0.0, le=1.0)
    bbox: List[float] = Field(
        ...,
        description="Normalized bounding box [ymin, xmin, ymax, xmax] with values from 0.0 to 1.0"
    )
    bbox_pixels: Optional[List[int]] = Field(
        default=None,
        description="Pixel coordinates [x1, y1, x2, y2]"
    )
    accessibility_impact: str = Field(
        ...,
        description="Human-readable explanation of impact on pedestrian / wheelchair navigation"
    )
    barrier_category: Optional[BarrierCategory] = Field(
        default=None,
        description="Associated accessibility barrier category (one of the 7 supported classes)"
    )
    source: DetectionSource = Field(
        default=DetectionSource.ai_detected,
        description="Provenance: ai_detected, human_confirmed, or manually_annotated"
    )
    verification_status: VerificationStatus = Field(
        default=VerificationStatus.ai_suggested,
        description="Verification state: ai_suggested, human_verified, or rejected"
    )
    model_id: str = Field(
        default="yolov8n-coco",
        description="Pretrained model identifier or 'manual_annotation'"
    )
    notes: Optional[str] = Field(default=None, description="Optional auditor notes")


class VisionAnalyzeResponse(BaseModel):
    image_id: str
    filename: str
    image_width: int
    image_height: int
    gps_coordinates: Optional[Coordinate] = None
    detections: List[VisionDetection] = []
    model_info: Dict[str, Any]
    inference_time_ms: float
    raw_model_classes_detected: List[str] = []
    unsupported_classes_notes: str
    image_url: Optional[str] = None


class DetectionUpdateRequest(BaseModel):
    barrier_category: Optional[BarrierCategory] = None
    verification_status: Optional[VerificationStatus] = None
    bbox: Optional[List[float]] = None
    notes: Optional[str] = None


class ManualAnnotationRequest(BaseModel):
    image_id: str
    barrier_category: BarrierCategory
    bbox: List[float] = Field(..., description="[ymin, xmin, ymax, xmax] normalized 0.0 to 1.0")
    accessibility_impact: Optional[str] = None
    notes: Optional[str] = None


class CandidateSegment(BaseModel):
    segment_id: str
    name: str
    distance_meters: float
    highway: str
    surface: str
    has_stairs: bool
    curb_ramp: str
    is_verified: bool
    coordinates: List[List[float]]


class SegmentMatchRequest(BaseModel):
    lat: float
    lon: float
    radius_meters: float = Field(default=120.0, description="Search radius in meters")


class SegmentMatchResponse(BaseModel):
    query_location: Coordinate
    candidate_segments: List[CandidateSegment]
    matched_closest_segment_id: Optional[str] = None
    is_ambiguous: bool = False
    message: str


class ConfirmBarrierRequest(BaseModel):
    detection_id: Optional[str] = None
    segment_id: str
    barrier_category: BarrierCategory
    description: str
    location: Coordinate
    severity: str = Field(default="high", description="critical, high, medium, low")
    verification_status: VerificationStatus = VerificationStatus.human_verified
    source: str = "streetvision_ai"
    barrier_type: BarrierType = BarrierType.temporary
    duration_minutes: Optional[int] = Field(default=1440, description="Duration before auto-expiry for temporary barriers")
    notes: Optional[str] = None


class ConfirmedBarrier(BaseModel):
    id: str
    detection_id: Optional[str] = None
    segment_id: str
    segment_name: Optional[str] = None
    barrier_category: BarrierCategory
    description: str
    location: Coordinate
    severity: str
    prohibits_wheelchair: bool
    cost_multiplier: float
    verification_status: VerificationStatus
    source: str
    barrier_type: BarrierType = BarrierType.temporary
    duration_minutes: Optional[int] = None
    created_at: str
    expires_at: Optional[str] = None
    is_active: bool = True
    image_url: Optional[str] = None
    notes: Optional[str] = None


class ConfirmedBarriersResponse(BaseModel):
    total_barriers: int
    barriers: List[ConfirmedBarrier]
    active_overlay: bool


class UserBarrierReportRequest(BaseModel):
    barrier_category: BarrierCategory
    segment_id: str
    latitude: float
    longitude: float
    barrier_type: BarrierType = BarrierType.temporary
    duration_minutes: Optional[int] = Field(default=1440, description="Expiry duration in minutes (e.g. 1 for demo, 60, 1440, 10080)")
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_filename: Optional[str] = None
    detection_id: Optional[str] = None
    notes: Optional[str] = None


class BarrierReportItem(BaseModel):
    id: str
    barrier_category: BarrierCategory
    segment_id: str
    segment_name: Optional[str] = None
    latitude: float
    longitude: float
    barrier_type: BarrierType
    duration_minutes: Optional[int] = None
    source: str
    verification_status: str
    created_at: str
    updated_at: str
    expires_at: Optional[str] = None
    is_active: bool
    prohibits_wheelchair: bool
    cost_multiplier: float
    image_url: Optional[str] = None
    notes: Optional[str] = None


class BarrierReportsResponse(BaseModel):
    total_reports: int
    active_count: int
    expired_count: int
    reports: List[BarrierReportItem]
