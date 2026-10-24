import io
import json
import time
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image, ExifTags

from ..schemas.routes import Coordinate
from ..schemas.vision import (
    BarrierCategory,
    DetectionSource,
    VerificationStatus,
    VisionDetection,
    VisionAnalyzeResponse,
    DetectionUpdateRequest,
    ManualAnnotationRequest,
)

# Supported classes in standard COCO pretrained model that have mobility relevance
COCO_MOBILITY_MAPPING = {
    "motorcycle": {
        "category": BarrierCategory.parked_vehicle_blocking_footpath,
        "impact": "Potential Footpath Obstruction: Two-wheeler detected on walkway. Verify if parked across pedestrian corridor (< 0.9m clearance).",
        "severity": "critical",
    },
    "car": {
        "category": BarrierCategory.parked_vehicle_blocking_footpath,
        "impact": "Vehicle Encroachment: Vehicle detected. Verify if parked on kerb ramp or blocking pedestrian walkway.",
        "severity": "critical",
    },
    "bicycle": {
        "category": BarrierCategory.parked_vehicle_blocking_footpath,
        "impact": "Bicycle Obstruction: Bicycle detected along pedestrian path. Verify usable clear width.",
        "severity": "high",
    },
    "bus": {
        "category": BarrierCategory.parked_vehicle_blocking_footpath,
        "impact": "Heavy Vehicle Presence: Bus / Transit vehicle detected near pedestrian boarding zone.",
        "severity": "critical",
    },
    "truck": {
        "category": BarrierCategory.parked_vehicle_blocking_footpath,
        "impact": "Loading Vehicle Obstruction: Truck detected near footpath.",
        "severity": "critical",
    },
    "bench": {
        "category": None,
        "impact": "Pedestrian Amenity: Rest bench detected. Beneficial resting point for elderly and assisted walkers.",
        "severity": "low",
    },
    "traffic light": {
        "category": None,
        "impact": "Controlled Crossing Infrastructure: Traffic signal detected at pedestrian transition.",
        "severity": "low",
    },
    "stop sign": {
        "category": None,
        "impact": "Intersection Control: Stop sign detected near pedestrian right-of-way.",
        "severity": "low",
    },
    "fire hydrant": {
        "category": BarrierCategory.pole_obstruction,
        "impact": "Walkway Constriction: Fixed utility object detected. Check minimum 0.9m passing clearance.",
        "severity": "medium",
    },
    "person": {
        "category": None,
        "impact": "Active Pedestrian: Person detected navigating walking network.",
        "severity": "low",
    },
}


class VisionService:
    """
    Modular StreetVision Computer Vision & Annotation Service.
    - Pretrained YOLO object detection for vehicles & street elements.
    - EXIF GPS coordinate extraction from street-level smartphone imagery.
    - Manual annotation engine for specialized Indian infrastructure (stairs, broken footpaths, missing curb cuts).
    - Provenance tracking (AI Suggested, Human Verified, Manually Annotated).
    """

    def __init__(self, uploads_dir: Optional[Path] = None, dataset_dir: Optional[Path] = None):
        if uploads_dir is None:
            uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
        if dataset_dir is None:
            dataset_dir = Path(__file__).resolve().parent.parent.parent.parent / "dataset"

        self.uploads_dir = uploads_dir
        self.dataset_dir = dataset_dir
        self.uploads_dir.mkdir(parents=True, exist_ok=True)

        self.model: Optional[Any] = None
        self.model_loaded = False
        self.model_id = "yolov8n-coco"

        # In-memory storage for active session
        self.detections_cache: Dict[str, VisionDetection] = {}
        self.analysis_cache: Dict[str, VisionAnalyzeResponse] = {}

        self._try_init_model()

    def _try_init_model(self) -> None:
        """Attempts to load Ultralytics YOLO model if installed."""
        try:
            from ultralytics import YOLO
            # Load lightweight YOLOv8 nano model
            self.model = YOLO("yolov8n.pt")
            self.model_loaded = True
            print("StreetVision: Ultralytics YOLOv8n initialized successfully.")
        except Exception as e:
            self.model_loaded = False
            self.model = None
            print(f"StreetVision: Pretrained YOLOv8 not available or initializing in fallback mode ({e}).")

    @staticmethod
    def extract_exif_gps(image: Image.Image) -> Optional[Coordinate]:
        """
        Extracts GPS decimal coordinates from image EXIF tags if present.
        Returns Coordinate(lat, lon) or None.
        """
        try:
            exif_raw = image._getexif()
            if not exif_raw:
                return None

            gps_info = {}
            for tag_id, value in exif_raw.items():
                tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                if tag_name == "GPSInfo":
                    for key in value:
                        sub_tag = ExifTags.GPSTAGS.get(key, key)
                        gps_info[sub_tag] = value[key]

            if not gps_info or "GPSLatitude" not in gps_info or "GPSLongitude" not in gps_info:
                return None

            def convert_to_degrees(dms_tuple) -> float:
                d = float(dms_tuple[0])
                m = float(dms_tuple[1])
                s = float(dms_tuple[2])
                return d + (m / 60.0) + (s / 3600.0)

            lat = convert_to_degrees(gps_info["GPSLatitude"])
            if gps_info.get("GPSLatitudeRef") == "S":
                lat = -lat

            lon = convert_to_degrees(gps_info["GPSLongitude"])
            if gps_info.get("GPSLongitudeRef") == "W":
                lon = -lon

            return Coordinate(lat=round(lat, 6), lon=round(lon, 6), name="EXIF Geotag")
        except Exception:
            return None

    def analyze_image(self, file_bytes: bytes, filename: str) -> VisionAnalyzeResponse:
        """
        Processes uploaded street image:
        1. Validates dimensions & reads EXIF GPS.
        2. Executes real YOLO inference on supported COCO categories.
        3. Integrates audited ground-truth fixtures if matched with known dataset images.
        4. Returns structured detections with honest categorization.
        """
        start_time = time.time()
        image_id = f"img_{uuid.uuid4().hex[:10]}"

        # Validate image
        try:
            image = Image.open(io.BytesIO(file_bytes))
            image.verify()  # Verify integrity
            # Re-open for operations
            image = Image.open(io.BytesIO(file_bytes))
            # Convert to RGB if needed
            if image.mode != "RGB":
                image = image.convert("RGB")
        except Exception as e:
            raise ValueError(f"Invalid or corrupted image file: {str(e)}")

        width, height = image.size

        # Extract EXIF GPS
        gps_coord = self.extract_exif_gps(image)

        # Save image file to uploads directory for frontend serving
        save_path = self.uploads_dir / f"{image_id}_{filename}"
        image.save(save_path, "JPEG", quality=90)
        image_url = f"/uploads/{image_id}_{filename}"

        detections: List[VisionDetection] = []
        raw_classes: List[str] = []

        # 1. Run Real Pretrained YOLO Inference if loaded
        if self.model is not None and self.model_loaded:
            try:
                results = self.model(image, conf=0.30, verbose=False)
                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        cls_idx = int(box.cls[0].item())
                        cls_name = r.names.get(cls_idx, f"class_{cls_idx}")
                        conf = float(box.conf[0].item())
                        raw_classes.append(cls_name)

                        # Bounding box coordinates: [x1, y1, x2, y2]
                        x1, y1, x2, y2 = [int(v.item()) for v in box.xyxy[0]]
                        ymin = max(0.0, min(1.0, y1 / float(height)))
                        xmin = max(0.0, min(1.0, x1 / float(width)))
                        ymax = max(0.0, min(1.0, y2 / float(height)))
                        xmax = max(0.0, min(1.0, x2 / float(width)))

                        # Map to mobility taxonomy
                        mobility_info = COCO_MOBILITY_MAPPING.get(cls_name.lower())
                        if mobility_info:
                            cat = mobility_info["category"]
                            impact = mobility_info["impact"]
                        else:
                            cat = None
                            impact = f"General detected object: {cls_name}. Does not constitute a verified pedestrian barrier."

                        det = VisionDetection(
                            id=f"det_{uuid.uuid4().hex[:8]}",
                            label=cls_name,
                            confidence=round(conf, 3),
                            bbox=[round(ymin, 4), round(xmin, 4), round(ymax, 4), round(xmax, 4)],
                            bbox_pixels=[x1, y1, x2, y2],
                            accessibility_impact=impact,
                            barrier_category=cat,
                            source=DetectionSource.ai_detected,
                            verification_status=VerificationStatus.ai_suggested,
                            model_id=self.model_id,
                            notes=f"Detected by pretrained {self.model_id} model.",
                        )
                        detections.append(det)
                        self.detections_cache[det.id] = det
            except Exception as e:
                print(f"YOLO inference runtime error: {e}")

        # 2. Check if the image matches an audited Indian Street dataset fixture
        # (e.g. jaipur_albert_hall_stairs, jaipur_ram_niwas_parked_scooter, etc.)
        matched_annotation = self._find_dataset_annotation(filename)
        if matched_annotation:
            if not gps_coord and "location" in matched_annotation:
                loc = matched_annotation["location"]
                gps_coord = Coordinate(lat=loc["lat"], lon=loc["lon"], name=loc.get("name"))

            # Merge audited ground-truth annotations with clear human verification status
            for ann in matched_annotation.get("annotations", []):
                # Avoid duplicate if AI already detected similar
                det_id = f"det_{uuid.uuid4().hex[:8]}"
                cat_str = ann.get("barrier_category")
                try:
                    b_cat = BarrierCategory(cat_str) if cat_str else None
                except ValueError:
                    b_cat = None

                det = VisionDetection(
                    id=det_id,
                    label=ann.get("label", cat_str),
                    confidence=ann.get("confidence", 1.0),
                    bbox=ann.get("bbox_normalized", [0.2, 0.2, 0.8, 0.8]),
                    bbox_pixels=ann.get("bbox_pixels"),
                    accessibility_impact=ann.get("accessibility_impact", "Verified pedestrian infrastructure barrier."),
                    barrier_category=b_cat,
                    source=DetectionSource(ann.get("source", "manually_annotated")),
                    verification_status=VerificationStatus(ann.get("verification_status", "human_verified")),
                    model_id=ann.get("model_id", "manual_audit_field_survey"),
                    notes=ann.get("notes"),
                )
                detections.append(det)
                self.detections_cache[det.id] = det

        inference_time_ms = round((time.time() - start_time) * 1000.0, 1)

        unsupported_notes = (
            "Pretrained standard models (COCO) detect standard vehicles and objects. Specialized pedestrian "
            "accessibility barriers (Stairs, Missing Kerb Ramps, Broken Footpaths, Uneven Cobblestones) "
            "require human verification or manual annotation as per PATHWISE AI integrity standards."
        )

        response = VisionAnalyzeResponse(
            image_id=image_id,
            filename=filename,
            image_width=width,
            image_height=height,
            gps_coordinates=gps_coord,
            detections=detections,
            model_info={
                "model_name": self.model_id,
                "loaded": self.model_loaded,
                "engine": "Ultralytics YOLOv8" if self.model_loaded else "Modular Vision Service",
                "total_detections": len(detections),
            },
            inference_time_ms=inference_time_ms,
            raw_model_classes_detected=list(set(raw_classes)),
            unsupported_classes_notes=unsupported_notes,
            image_url=image_url,
        )

        self.analysis_cache[image_id] = response
        return response

    def _find_dataset_annotation(self, filename: str) -> Optional[Dict[str, Any]]:
        """Matches uploaded filename or prefix with audited dataset annotations."""
        base_name = Path(filename).stem.lower()
        ann_dir = self.dataset_dir / "annotations"
        if not ann_dir.exists():
            return None

        # Try exact match or stem match
        for f in ann_dir.glob("*.json"):
            if f.stem.lower() in base_name or base_name in f.stem.lower():
                try:
                    with open(f, "r", encoding="utf-8") as jf:
                        return json.load(jf)
                except Exception:
                    pass
        return None

    def get_detection(self, detection_id: str) -> Optional[VisionDetection]:
        """Retrieves cached detection by ID."""
        return self.detections_cache.get(detection_id)

    def update_detection(self, detection_id: str, update: DetectionUpdateRequest) -> VisionDetection:
        """
        Updates an existing detection:
        - Confirm AI detection (change status to human_verified).
        - Reject incorrect detection (change status to rejected).
        - Correct barrier category.
        - Adjust bounding box.
        - Add notes.
        """
        det = self.detections_cache.get(detection_id)
        if not det:
            raise KeyError(f"Detection with ID '{detection_id}' not found.")

        if update.barrier_category is not None:
            det.barrier_category = update.barrier_category
        if update.verification_status is not None:
            det.verification_status = update.verification_status
            if update.verification_status == VerificationStatus.human_verified:
                det.source = DetectionSource.human_confirmed
        if update.bbox is not None:
            det.bbox = update.bbox
        if update.notes is not None:
            det.notes = update.notes

        self.detections_cache[detection_id] = det
        return det

    def add_manual_annotation(self, req: ManualAnnotationRequest) -> VisionDetection:
        """
        Adds a new manual barrier annotation:
        - Assigns unique ID.
        - Sets source as manually_annotated.
        - Sets verification_status as human_verified.
        """
        det_id = f"det_man_{uuid.uuid4().hex[:8]}"
        impact = req.accessibility_impact or f"Manually verified {req.barrier_category.value.replace('_', ' ')}."

        det = VisionDetection(
            id=det_id,
            label=req.barrier_category.value.replace("_", " ").title(),
            confidence=1.0,
            bbox=req.bbox,
            accessibility_impact=impact,
            barrier_category=req.barrier_category,
            source=DetectionSource.manually_annotated,
            verification_status=VerificationStatus.human_verified,
            model_id="manual_annotation",
            notes=req.notes or "Manually annotated by accessibility surveyor.",
        )

        self.detections_cache[det_id] = det

        # Also add to image analysis cache if image_id known
        if req.image_id in self.analysis_cache:
            self.analysis_cache[req.image_id].detections.append(det)

        return det
