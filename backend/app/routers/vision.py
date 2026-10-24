from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse

from ..schemas.vision import (
    VisionDetection,
    VisionAnalyzeResponse,
    DetectionUpdateRequest,
    ManualAnnotationRequest,
    SegmentMatchRequest,
    SegmentMatchResponse,
    ConfirmBarrierRequest,
    ConfirmedBarrier,
    ConfirmedBarriersResponse,
    UserBarrierReportRequest,
    BarrierReportItem,
    BarrierReportsResponse,
)

router = APIRouter(prefix="/api/vision", tags=["StreetVision AI"])


@router.get("/sample-images", summary="List Sample Indian Street Demonstration Images")
async def get_sample_images(request: Request):
    """
    Returns curated sample Indian street demonstration images and their surveyed metadata
    for instant analysis and testing in the StreetVision workspace.
    """
    vision_service = request.app.state.vision_service
    dataset_dir = getattr(vision_service, "dataset_dir", None)
    if dataset_dir is None:
        dataset_dir = Path(__file__).resolve().parent.parent.parent.parent / "dataset"
    manifest_path = dataset_dir / "metadata" / "dataset_manifest.json"
    if manifest_path.exists():
        import json
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
            return manifest.get("sample_images", [])
    return []


@router.get("/sample-images/{filename}", summary="Serve Dataset Sample Image")
async def get_sample_image_file(filename: str, request: Request):
    """Serves the raw image file from the dataset/images folder."""
    vision_service = request.app.state.vision_service
    dataset_dir = getattr(vision_service, "dataset_dir", None)
    if dataset_dir is None:
        dataset_dir = Path(__file__).resolve().parent.parent.parent.parent / "dataset"
    images_dir = dataset_dir / "images"
    target = images_dir / filename
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail=f"Sample image '{filename}' not found.")
    return FileResponse(target, media_type="image/jpeg")


@router.post("/analyze", response_model=VisionAnalyzeResponse, summary="Analyze Street Image with AI & Audited Fixtures")
async def analyze_street_image(
    request: Request,
    file: UploadFile = File(...),
) -> VisionAnalyzeResponse:
    """
    Ingests an uploaded street-level photograph (JPEG/PNG):
    - Validates file integrity and size (< 15MB).
    - Extracts embedded EXIF GPS coordinates (lat, lon) when available.
    - Runs real pretrained YOLOv8 object detection on mobility-relevant classes.
    - Integrates ground-truth audited annotations if matching a surveyed Indian infrastructure fixture.
    - Categorizes detections honestly as AI Suggested or Human Verified.
    """
    # Validate content type
    valid_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type and file.content_type.lower() not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file.content_type}'. Please upload JPG, JPEG, or PNG.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File size exceeds maximum allowed limit of 15MB.",
        )

    vision_service = request.app.state.vision_service
    try:
        return vision_service.analyze_image(file_bytes, file.filename or "uploaded_image.jpg")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference pipeline failure: {str(e)}")


@router.get("/detections/{detection_id}", response_model=VisionDetection, summary="Get Detection Details")
async def get_detection(detection_id: str, request: Request) -> VisionDetection:
    """Retrieves an existing detection by its identifier."""
    vision_service = request.app.state.vision_service
    det = vision_service.get_detection(detection_id)
    if not det:
        raise HTTPException(status_code=404, detail=f"Detection '{detection_id}' not found.")
    return det


@router.patch("/detections/{detection_id}", response_model=VisionDetection, summary="Correct or Verify Detection")
async def update_detection(
    detection_id: str, payload: DetectionUpdateRequest, request: Request
) -> VisionDetection:
    """
    Allows human auditor to confirm, reject, correct the category, adjust bounding box,
    or append audit notes to an AI detection.
    """
    vision_service = request.app.state.vision_service
    try:
        return vision_service.update_detection(detection_id, payload)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Detection '{detection_id}' not found.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/annotations", response_model=VisionDetection, summary="Create Manual Accessibility Annotation")
async def create_manual_annotation(
    payload: ManualAnnotationRequest, request: Request
) -> VisionDetection:
    """
    Explicit mechanism to manually annotate unsupported accessibility categories
    (Stairs, Missing Kerb Ramps, Broken Footpaths, Uneven Surfaces) without fabricating AI output.
    """
    vision_service = request.app.state.vision_service
    try:
        return vision_service.add_manual_annotation(payload)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/segment-match", response_model=SegmentMatchResponse, summary="Find Candidate Pedestrian Footpaths")
async def match_candidate_segments(
    payload: SegmentMatchRequest, request: Request
) -> SegmentMatchResponse:
    """
    Searches the NetworkX pedestrian graph around a given lat/lon (from EXIF GPS or user map pick)
    and returns sorted candidate footpath segments with ambiguity detection.
    """
    graph_service = request.app.state.graph_service
    return graph_service.match_candidate_segments(payload.lat, payload.lon, payload.radius_meters)


@router.post("/confirm-barrier", response_model=ConfirmedBarrier, summary="Confirm Barrier & Update Routing Graph")
async def confirm_barrier(
    payload: ConfirmBarrierRequest, request: Request
) -> ConfirmedBarrier:
    """
    Associates a confirmed obstacle with a specific footpath segment and immediately
    injects it into the dynamic graph routing overlay, affecting wheelchair and accessibility costs.
    """
    graph_service = request.app.state.graph_service
    try:
        return graph_service.confirm_barrier(payload)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to confirm barrier: {str(e)}")


@router.get("/barriers", response_model=ConfirmedBarriersResponse, summary="Get Active Confirmed Barriers")
async def get_confirmed_barriers(request: Request) -> ConfirmedBarriersResponse:
    """Returns all currently active dynamic confirmed barriers on the pedestrian graph."""
    graph_service = request.app.state.graph_service
    return graph_service.get_confirmed_barriers()


@router.delete("/barriers/{barrier_id}", summary="Remove Dynamic Confirmed Barrier")
async def remove_confirmed_barrier(barrier_id: str, request: Request):
    """Removes a dynamic barrier from the graph overlay and restores the original edge properties."""
    graph_service = request.app.state.graph_service
    success = graph_service.remove_confirmed_barrier(barrier_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Barrier '{barrier_id}' not found.")
    return {"success": True, "message": f"Barrier '{barrier_id}' removed and segment restored."}


@router.post("/user-report", response_model=BarrierReportItem, summary="Submit Citizen Photo Barrier Report")
async def submit_user_report(
    payload: UserBarrierReportRequest, request: Request
) -> BarrierReportItem:
    """
    Ingests a citizen-reported obstacle with photo context and duration.
    Persists to SQLite and updates the active routing graph immediately (< 60s propagation).
    """
    graph_service = request.app.state.graph_service
    try:
        return graph_service.add_user_report(payload)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit barrier report: {str(e)}")


@router.get("/reports", response_model=BarrierReportsResponse, summary="List All Barrier Reports")
async def list_barrier_reports(request: Request) -> BarrierReportsResponse:
    """Returns all recorded barrier reports with active vs expired tallies and expiration timestamps."""
    graph_service = request.app.state.graph_service
    return graph_service.get_all_reports()


@router.post("/check-expirations", summary="Run Temporary Barrier Auto-Expiration Check")
async def check_expirations(request: Request):
    """
    Evaluates all temporary barriers against current UTC timestamp.
    Deactivates expired barriers from the routing overlay while preserving them in history.
    """
    graph_service = request.app.state.graph_service
    expired_count = graph_service.report_store.cleanup_expired()
    if expired_count > 0:
        graph_service._sync_active_barriers_from_store()
    return {
        "success": True,
        "newly_expired_count": expired_count,
        "active_barriers_count": len(graph_service.confirmed_barriers),
    }


@router.delete("/reports/{report_id}", summary="Delete or Deactivate Report")
async def delete_report(report_id: str, request: Request):
    """Deactivates a barrier report by ID and updates live graph overlay."""
    graph_service = request.app.state.graph_service
    success = graph_service.remove_confirmed_barrier(report_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found.")
    return {"success": True, "message": f"Report '{report_id}' deactivated."}


@router.post("/reset-barriers", summary="Reset All Dynamic Barriers to Baseline")
async def reset_dynamic_barriers(request: Request):
    """Restores the pedestrian routing graph to its clean demonstration baseline."""
    graph_service = request.app.state.graph_service
    graph_service.reset_dynamic_barriers()
    return {"success": True, "message": "Graph restored to pristine baseline. All dynamic barriers cleared."}

