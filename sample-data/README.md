# PATHWISE AI Sample Data Specification

This directory holds structural sample data illustrating the schema used by PATHWISE AI for accessibility-weighted pedestrian routing and hazard detection.

## Files

1. `pedestrian_segments.geojson`:
   - Formatted in standard GeoJSON.
   - Properties reflect key pedestrian mobility attributes:
     - `surface`: Sidewalk paving material (e.g., concrete, asphalt, pavers).
     - `width_meters`: Minimum usable width.
     - `curb_ramp_installed`: Boolean presence of curb ramps at intersections.
     - `curb_ramp_grade_pct`: Incline gradient of curb transitions.
     - `tactile_paving`: Detectable warning surfaces for low-vision pedestrians.
     - `lighting_score`: Normalized lighting estimate (0.0 to 1.0).
     - `incline_pct`: Grade/slope of sidewalk path.
     - `audible_signals`: Crossing signal accessibility.

2. `hazards_mock.json`:
   - Structural preview of transient and static hazards detected via StreetVision computer vision in Phase 3.
   - Includes severity levels, targeted mobility profile impacts, and geographic markers.

> **Note**: In Phase 1, these datasets serve as architectural specifications and contract schemas. Live routing using OSMnx/NetworkX and live computer vision inference are deferred to Phase 2 and Phase 3 respectively.
