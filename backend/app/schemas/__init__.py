"""Pydantic schemas for PATHWISE AI API."""

from .health import HealthResponse, SystemDiagnosticsResponse
from .routes import (
    Coordinate,
    RouteProfile,
    AccessibilityBarrier,
    SegmentFeature,
    RouteRequest,
    RouteResponse,
    MapConfigResponse,
    SegmentsResponse,
    DemoScenario,
)

__all__ = [
    "HealthResponse",
    "SystemDiagnosticsResponse",
    "Coordinate",
    "RouteProfile",
    "AccessibilityBarrier",
    "SegmentFeature",
    "RouteRequest",
    "RouteResponse",
    "MapConfigResponse",
    "SegmentsResponse",
    "DemoScenario",
    "BarrierCategory",
    "DetectionSource",
    "VerificationStatus",
    "VisionDetection",
    "VisionAnalyzeResponse",
    "DetectionUpdateRequest",
    "ManualAnnotationRequest",
    "CandidateSegment",
    "SegmentMatchRequest",
    "SegmentMatchResponse",
    "ConfirmBarrierRequest",
    "ConfirmedBarrier",
    "ConfirmedBarriersResponse",
]

from .vision import (
    BarrierCategory,
    DetectionSource,
    VerificationStatus,
    VisionDetection,
    VisionAnalyzeResponse,
    DetectionUpdateRequest,
    ManualAnnotationRequest,
    CandidateSegment,
    SegmentMatchRequest,
    SegmentMatchResponse,
    ConfirmBarrierRequest,
    ConfirmedBarrier,
    ConfirmedBarriersResponse,
)
