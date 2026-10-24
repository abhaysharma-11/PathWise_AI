# PATHWISE AI — Indian Pedestrian Street Image Dataset
**Project**: PATHWISE AI (HypNex Hackathon — Problem Statement SC-02)  
**Location Focus**: Ram Niwas Garden, Albert Hall Cultural Precinct, Jaipur, Rajasthan, India  
**Annotation Standard**: Pascal VOC / YOLO normalized bounding box format with accessibility impact taxonomy

---

## 1. Overview & Ethical Integrity

Standard international computer vision datasets (e.g. COCO, Cityscapes, ImageNet) do not adequately capture the distinctive infrastructure realities of Indian pedestrian spaces:
* Absence or sudden termination of kerb ramps
* Heritage monumental staircases at civic landmark entrances
* Two-wheelers / scooters parked across footpaths
* Uneven stone cobblestone paving and surface heaves
* Utility poles and tree roots encroaching into clear walking corridors

This dataset structure provides a local, verifiable repository for street-level images with human-audited accessibility annotations.

> **Ethical Notice**: In compliance with competition integrity rules, no copyrighted internet images are passed off as proprietary data. All initial demonstration images are locally created and audited fixtures representing surveyed geometry in the Jaipur precinct.

---

## 2. Directory Structure

```text
dataset/
├── images/             # Raw street-level imagery (.jpg, .jpeg, .png)
├── annotations/        # Structured JSON annotations with normalized bboxes
├── metadata/           # Dataset manifests, class distributions, schema versions
└── README.md           # Dataset documentation, guidelines, and fine-tuning instructions
```

---

## 3. Supported Accessibility Barrier Taxonomy

PATHWISE AI explicitly recognizes **7 core pedestrian accessibility barrier classes**:

| Category ID | Display Name | Severity for Wheelchair | Severity for Elderly | Routing Impact |
| :--- | :--- | :--- | :--- | :--- |
| `stairs` | Stairs / Monumental Steps | **Critical** (Impassable) | High (10x penalty) | Prohibits route segment |
| `missing_curb_ramp` | Missing Kerb Ramp | **Critical** (Impassable) | Medium (3x penalty) | Prohibits route segment |
| `broken_footpath` | Broken / Discontinuous Footpath | **High** | High (5x penalty) | 6x penalty or reroute |
| `missing_footpath` | Missing Footpath (Forced into road) | **Critical** | High (8x penalty) | 10x penalty or reroute |
| `pole_obstruction` | Utility Pole / Mast Obstruction | **High** (<90cm clear width) | Medium (2x penalty) | Constriction penalty |
| `parked_vehicle_blocking_footpath` | Vehicle Parked on Walkway | **Critical** (Total blockage) | High (4x penalty) | Prohibits or reroutes |
| `uneven_surface` | Uneven Cobblestones / Broken Pavers | **Medium** (High rolling resist.)| High (Tripping hazard)| 3x-4x surface penalty |

---

## 4. Annotation Schema

Each annotation record in `dataset/annotations/{image_id}.json` conforms to the following schema:

```json
{
  "image_id": "jaipur_albert_hall_stairs_001",
  "filename": "jaipur_albert_hall_stairs.jpg",
  "width": 1280,
  "height": 720,
  "location": {
    "lat": 26.9130,
    "lon": 75.8189,
    "name": "Monumental Heritage Staircase, Albert Hall North Forecourt"
  },
  "candidate_segment_id": "seg_05_monumental_stairs",
  "annotations": [
    {
      "id": "ann_stairs_001",
      "barrier_category": "stairs",
      "bbox_normalized": [0.35, 0.15, 0.85, 0.85],
      "source": "manual_audit_field_survey",
      "verification_status": "human_verified",
      "severity": "critical",
      "notes": "18 stone steps without integrated ramp; 16.5% effective incline."
    }
  ]
}
```

---

## 5. Adding & Annotating New Images

1. **Place raw image** in `dataset/images/` (recommended resolution: at least $640 \times 480$ px).
2. **Ensure EXIF GPS tags are preserved** when capturing via smartphone or GPS-enabled camera.
3. **Upload via StreetVision UI** or register directly using the PATHWISE AI API:
   - Run AI detection to identify detectable elements (e.g. vehicles, persons).
   - Manually annotate unsupported accessibility infrastructure (e.g. stairs, missing curb cuts, broken surfaces).
   - Verify candidate segment on the interactive map.
   - Confirm barrier association to update the dynamic graph overlay.
4. **Export for Fine-Tuning**:
   - The annotated bounding boxes can be exported to standard YOLO format (`<class_id> <x_center> <y_center> <width> <height>`) for transfer learning on custom lightweight models.
