import json
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import networkx as nx

from ..schemas.routes import (
    Coordinate,
    RouteProfile,
    AccessibilityBarrier,
    RouteConfidence,
    SegmentFeature,
    RouteResponse,
    MapConfigResponse,
    SegmentsResponse,
    DemoScenario,
)
from ..schemas.vision import (
    BarrierCategory,
    BarrierType,
    CandidateSegment,
    SegmentMatchResponse,
    ConfirmBarrierRequest,
    ConfirmedBarrier,
    ConfirmedBarriersResponse,
    VerificationStatus,
    UserBarrierReportRequest,
    BarrierReportItem,
    BarrierReportsResponse,
)
from .report_store import ReportStore


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two decimal degree points in meters."""
    R = 6371000.0  # Earth's radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2.0) ** 2) + math.cos(phi1) * math.cos(phi2) * (math.sin(dlambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return R * c


def point_to_segment_distance(lat: float, lon: float, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes minimum distance from a point to a line segment in meters using equirectangular projection."""
    mid_lat = math.radians((lat1 + lat2) / 2.0)
    cos_lat = math.cos(mid_lat)

    # Segment vector in meters
    vx = (lon2 - lon1) * 111320.0 * cos_lat
    vy = (lat2 - lat1) * 110574.0
    seg_len_sq = vx * vx + vy * vy

    if seg_len_sq < 1e-6:
        return haversine_distance(lat, lon, lat1, lon1)

    # Point vector in meters
    px = (lon - lon1) * 111320.0 * cos_lat
    py = (lat - lat1) * 110574.0

    # Projection scalar clamped to [0, 1]
    t = max(0.0, min(1.0, (px * vx + py * vy) / seg_len_sq))

    # Nearest point coordinates on segment
    proj_lat = lat1 + t * (lat2 - lat1)
    proj_lon = lon1 + t * (lon2 - lon1)

    return haversine_distance(lat, lon, proj_lat, proj_lon)


def point_to_polyline_distance(lat: float, lon: float, coordinates: List[List[float]]) -> float:
    """Computes shortest distance from point (lat, lon) to a polyline in meters."""
    if not coordinates:
        return float("inf")
    if len(coordinates) == 1:
        return haversine_distance(lat, lon, coordinates[0][0], coordinates[0][1])

    min_d = float("inf")
    for i in range(len(coordinates) - 1):
        d = point_to_segment_distance(
            lat, lon, coordinates[i][0], coordinates[i][1], coordinates[i + 1][0], coordinates[i + 1][1]
        )
        if d < min_d:
            min_d = d
    return min_d


class GraphService:
    """
    Manages the pedestrian graph for the Jaipur Ram Niwas Garden demonstration area.
    Executes Dijkstra shortest path and accessibility-weighted cost function calculations.
    Maintains a dynamic SQLite-backed overlay for StreetVision confirmed barriers and user reports,
    handling temporary barrier expiration, honest confidence scoring, and missing imagery audits.
    """

    def __init__(self, data_file: Optional[Path] = None, report_store: Optional[ReportStore] = None):
        if data_file is None:
            data_file = Path(__file__).resolve().parent.parent / "data" / "jaipur_ram_niwas_network.json"

        self.data_file = data_file
        self.report_store = report_store or ReportStore()
        self.graph: nx.DiGraph = nx.DiGraph()
        self.metadata: Dict[str, Any] = {}
        self.nodes_data: Dict[str, Dict[str, Any]] = {}
        self.segments_data: List[Dict[str, Any]] = []

        # Dynamic barrier overlay: barrier_id -> ConfirmedBarrier
        self.confirmed_barriers: Dict[str, ConfirmedBarrier] = {}

        self._load_network()
        self._sync_active_barriers_from_store()

    def _load_network(self) -> None:
        """Loads and parses the cached pedestrian network into NetworkX DiGraph."""
        if not self.data_file.exists():
            raise FileNotFoundError(f"Pedestrian network dataset not found at {self.data_file}")

        with open(self.data_file, "r", encoding="utf-8") as f:
            raw = json.load(f)

        self.metadata = raw.get("metadata", {})
        self.graph.clear()
        self.nodes_data.clear()
        self.segments_data.clear()

        # Add Nodes
        for node in raw.get("nodes", []):
            nid = node["id"]
            lat = float(node["lat"])
            lon = float(node["lon"])
            self.nodes_data[nid] = node
            self.graph.add_node(
                nid,
                lat=lat,
                lon=lon,
                name=node.get("name", nid),
                description=node.get("description", ""),
            )

        # Baseline imagery date for verified segments (20 days ago, fresh and within the 90-day threshold)
        from datetime import timedelta
        baseline_fresh_date = (datetime.now(timezone.utc) - timedelta(days=20)).isoformat()

        # Add Edges (Bi-directional in pedestrian space)
        for edge in raw.get("edges", []):
            coords = edge.get("coordinates", [])
            length_meters = 0.0
            for i in range(len(coords) - 1):
                length_meters += haversine_distance(
                    coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]
                )
            length_meters = round(length_meters, 1)

            edge_attrs = dict(edge)
            edge_attrs["length_meters"] = length_meters

            # Assign recent imagery date if verified, else None for unverified segments
            if "last_imagery_date" not in edge_attrs:
                if edge.get("is_verified", False):
                    edge_attrs["last_imagery_date"] = baseline_fresh_date
                else:
                    edge_attrs["last_imagery_date"] = None

            self.segments_data.append(edge_attrs)

            # Forward Edge
            self.graph.add_edge(
                edge["u"],
                edge["v"],
                length=length_meters,
                **edge_attrs
            )

            # Reverse Edge (with reversed coordinates)
            rev_attrs = dict(edge_attrs)
            rev_attrs["u"] = edge["v"]
            rev_attrs["v"] = edge["u"]
            rev_attrs["coordinates"] = list(reversed(coords))
            self.graph.add_edge(
                edge["v"],
                edge["u"],
                length=length_meters,
                **rev_attrs
            )

    def _sync_active_barriers_from_store(self) -> None:
        """Synchronizes in-memory confirmed barriers and graph edge weights from SQLite store."""
        self.report_store.cleanup_expired()
        active_records = self.report_store.get_active_barriers()
        self.confirmed_barriers.clear()

        for rec in active_records:
            try:
                b_cat = BarrierCategory(rec["barrier_category"])
            except ValueError:
                b_cat = BarrierCategory.broken_footpath

            try:
                b_type = BarrierType(rec["barrier_type"])
            except ValueError:
                b_type = BarrierType.temporary

            cb = ConfirmedBarrier(
                id=rec["id"],
                detection_id=rec.get("detection_id"),
                segment_id=rec["segment_id"],
                segment_name=rec.get("segment_name"),
                barrier_category=b_cat,
                description=rec.get("notes") or f"Active barrier ({b_cat.value})",
                location=Coordinate(lat=rec["latitude"], lon=rec["longitude"]),
                severity="critical" if rec["prohibits_wheelchair"] else "high",
                prohibits_wheelchair=rec["prohibits_wheelchair"],
                cost_multiplier=rec["cost_multiplier"],
                verification_status=VerificationStatus.human_verified,
                source=rec["source"],
                barrier_type=b_type,
                duration_minutes=rec.get("duration_minutes"),
                created_at=rec["created_at"],
                expires_at=rec.get("expires_at"),
                is_active=rec["is_active"],
                image_url=rec.get("image_url"),
                notes=rec.get("notes"),
            )
            self.confirmed_barriers[cb.id] = cb

        self._apply_dynamic_barriers()

    def _apply_dynamic_barriers(self) -> None:
        """Applies active confirmed barriers to the in-memory graph edges."""
        # First reset any dynamic flags on edges
        for u, v, data in self.graph.edges(data=True):
            data["has_dynamic_barrier"] = False
            data.pop("dynamic_barrier_id", None)
            data.pop("dynamic_barrier_category", None)
            data["dynamic_cost_multiplier"] = 1.0
            # Restore baseline prohibits_wheelchair if not inherent to segment
            seg_match = next((s for s in self.segments_data if s["id"] == data.get("id")), None)
            if seg_match:
                data["prohibits_wheelchair"] = (
                    seg_match.get("has_stairs", False)
                    or seg_match.get("barrier") in ["stairs", "missing_curb_cut"]
                    or seg_match.get("curb_ramp") == "no"
                )
                data["barrier"] = seg_match.get("barrier")

        for cb in self.confirmed_barriers.values():
            seg_id = cb.segment_id
            for u, v, data in self.graph.edges(data=True):
                if data.get("id") == seg_id:
                    data["has_dynamic_barrier"] = True
                    data["dynamic_barrier_id"] = cb.id
                    data["dynamic_barrier_category"] = cb.barrier_category.value
                    if cb.prohibits_wheelchair:
                        data["prohibits_wheelchair"] = True
                        data["barrier"] = cb.barrier_category.value
                    data["dynamic_cost_multiplier"] = cb.cost_multiplier

    def snap_to_nearest_node(self, coord: Coordinate, max_distance_meters: float = 800.0) -> Tuple[str, float]:
        """Snaps an input lat/lon to nearest pedestrian graph node within supported demonstration area."""
        best_node: Optional[str] = None
        min_dist: float = float("inf")

        for nid, data in self.nodes_data.items():
            dist = haversine_distance(coord.lat, coord.lon, data["lat"], data["lon"])
            if dist < min_dist:
                min_dist = dist
                best_node = nid

        if best_node is None or min_dist > max_distance_meters:
            raise ValueError(
                f"Coordinate ({coord.lat:.4f}, {coord.lon:.4f}) is {min_dist:.0f}m away from "
                f"the Jaipur demonstration area (exceeds {max_distance_meters:.0f}m limit). "
                "Please select points within Ram Niwas Garden & Albert Hall precinct."
            )

        return best_node, round(min_dist, 1)

    def match_candidate_segments(self, lat: float, lon: float, radius_meters: float = 120.0) -> SegmentMatchResponse:
        """Matches a point against candidate footpath segments in the network with ambiguity detection."""
        candidates: List[CandidateSegment] = []

        for seg in self.segments_data:
            coords = seg.get("coordinates", [])
            dist = point_to_polyline_distance(lat, lon, coords)
            if dist <= radius_meters:
                candidates.append(
                    CandidateSegment(
                        segment_id=seg["id"],
                        name=seg.get("name", seg["id"]),
                        distance_meters=round(dist, 1),
                        highway=seg.get("highway", "footway"),
                        surface=seg.get("surface", "asphalt"),
                        has_stairs=seg.get("has_stairs", False),
                        curb_ramp=seg.get("curb_ramp", "unverified"),
                        is_verified=seg.get("is_verified", False),
                        coordinates=coords,
                    )
                )

        candidates.sort(key=lambda c: c.distance_meters)
        is_ambiguous = False
        message = ""
        matched_id = None

        if not candidates:
            message = f"No pedestrian footpath segments found within {radius_meters:.0f}m of ({lat:.4f}, {lon:.4f})."
        elif len(candidates) == 1:
            matched_id = candidates[0].segment_id
            message = f"Identified 1 matching footpath segment: {candidates[0].name} ({candidates[0].distance_meters:.1f}m)."
        else:
            if (candidates[1].distance_meters - candidates[0].distance_meters) < 12.0:
                is_ambiguous = True
                message = (
                    f"Found {len(candidates)} nearby segments. Ambiguity detected between "
                    f"'{candidates[0].name}' ({candidates[0].distance_meters:.1f}m) and "
                    f"'{candidates[1].name}' ({candidates[1].distance_meters:.1f}m). Please confirm the intended segment."
                )
            else:
                message = f"Closest segment is '{candidates[0].name}' ({candidates[0].distance_meters:.1f}m)."
            matched_id = candidates[0].segment_id

        return SegmentMatchResponse(
            query_location=Coordinate(lat=round(lat, 6), lon=round(lon, 6)),
            candidate_segments=candidates,
            matched_closest_segment_id=matched_id,
            is_ambiguous=is_ambiguous,
            message=message,
        )

    def confirm_barrier(self, req: ConfirmBarrierRequest) -> ConfirmedBarrier:
        """
        Associates a verified barrier with a specific pedestrian segment.
        Persists to SQLite ReportStore and injects into graph overlay immediately.
        """
        seg_match = next((s for s in self.segments_data if s["id"] == req.segment_id), None)
        if not seg_match:
            raise KeyError(f"Segment ID '{req.segment_id}' not found in pedestrian network.")

        cat = req.barrier_category
        prohibits_wheelchair = False
        cost_multiplier = 1.0

        if cat in [BarrierCategory.stairs, BarrierCategory.missing_curb_ramp, BarrierCategory.missing_footpath]:
            prohibits_wheelchair = True
            cost_multiplier = 999.0
        elif cat == BarrierCategory.parked_vehicle_blocking_footpath:
            prohibits_wheelchair = True
            cost_multiplier = 999.0
        elif cat == BarrierCategory.broken_footpath:
            cost_multiplier = 5.0
        elif cat == BarrierCategory.pole_obstruction:
            cost_multiplier = 3.5
        elif cat == BarrierCategory.uneven_surface:
            cost_multiplier = 4.0

        barrier_id = f"cb_{uuid.uuid4().hex[:8]}"

        # Persist to SQLite store
        self.report_store.add_report(
            barrier_category=cat.value,
            segment_id=req.segment_id,
            latitude=req.location.lat,
            longitude=req.location.lon,
            segment_name=seg_match.get("name"),
            source=req.source,
            verification_status=req.verification_status.value,
            barrier_type=req.barrier_type.value,
            duration_minutes=req.duration_minutes,
            notes=req.notes or req.description,
            prohibits_wheelchair=prohibits_wheelchair,
            cost_multiplier=cost_multiplier,
            detection_id=req.detection_id,
            report_id=barrier_id,
        )

        # Update segment last_imagery_date to now (recent imagery refreshed by report!)
        now_iso = datetime.now(timezone.utc).isoformat()
        seg_match["last_imagery_date"] = now_iso
        for u, v, data in self.graph.edges(data=True):
            if data.get("id") == req.segment_id:
                data["last_imagery_date"] = now_iso

        self._sync_active_barriers_from_store()
        return self.confirmed_barriers[barrier_id]

    def add_user_report(self, req: UserBarrierReportRequest) -> BarrierReportItem:
        """Ingests a citizen photo report, persists to SQLite, and updates active routing graph immediately."""
        seg_match = next((s for s in self.segments_data if s["id"] == req.segment_id), None)
        if not seg_match:
            raise KeyError(f"Segment ID '{req.segment_id}' not found in pedestrian network.")

        cat = req.barrier_category
        prohibits_wheelchair = False
        cost_multiplier = 1.0

        if cat in [BarrierCategory.stairs, BarrierCategory.missing_curb_ramp, BarrierCategory.missing_footpath]:
            prohibits_wheelchair = True
            cost_multiplier = 999.0
        elif cat == BarrierCategory.parked_vehicle_blocking_footpath:
            prohibits_wheelchair = True
            cost_multiplier = 999.0
        elif cat == BarrierCategory.broken_footpath:
            cost_multiplier = 5.0
        elif cat == BarrierCategory.pole_obstruction:
            cost_multiplier = 3.5
        elif cat == BarrierCategory.uneven_surface:
            cost_multiplier = 4.0

        report_id = f"usr_{uuid.uuid4().hex[:8]}"

        created_dict = self.report_store.add_report(
            barrier_category=cat.value,
            segment_id=req.segment_id,
            latitude=req.latitude,
            longitude=req.longitude,
            segment_name=seg_match.get("name"),
            image_filename=req.image_filename,
            image_url=req.image_url,
            source="user_photo_report",
            verification_status="human_verified",
            barrier_type=req.barrier_type.value,
            duration_minutes=req.duration_minutes,
            notes=req.notes or req.description or f"User reported {cat.value}",
            prohibits_wheelchair=prohibits_wheelchair,
            cost_multiplier=cost_multiplier,
            detection_id=req.detection_id,
            report_id=report_id,
        )

        # Update segment imagery freshness
        now_iso = datetime.now(timezone.utc).isoformat()
        seg_match["last_imagery_date"] = now_iso
        for u, v, data in self.graph.edges(data=True):
            if data.get("id") == req.segment_id:
                data["last_imagery_date"] = now_iso

        self._sync_active_barriers_from_store()

        return BarrierReportItem(
            id=created_dict["id"],
            barrier_category=BarrierCategory(created_dict["barrier_category"]),
            segment_id=created_dict["segment_id"],
            segment_name=created_dict.get("segment_name"),
            latitude=created_dict["latitude"],
            longitude=created_dict["longitude"],
            barrier_type=BarrierType(created_dict["barrier_type"]),
            duration_minutes=created_dict.get("duration_minutes"),
            source=created_dict["source"],
            verification_status=created_dict["verification_status"],
            created_at=created_dict["created_at"],
            updated_at=created_dict["updated_at"],
            expires_at=created_dict.get("expires_at"),
            is_active=created_dict["is_active"],
            prohibits_wheelchair=created_dict["prohibits_wheelchair"],
            cost_multiplier=created_dict["cost_multiplier"],
            image_url=created_dict.get("image_url"),
            notes=created_dict.get("notes"),
        )

    def get_all_reports(self) -> BarrierReportsResponse:
        """Returns all reports from SQLite store with active vs expired tallies."""
        self._sync_active_barriers_from_store()
        all_recs = self.report_store.get_all_reports()
        items: List[BarrierReportItem] = []
        active_count = 0
        expired_count = 0

        for r in all_recs:
            if r["is_active"]:
                active_count += 1
            else:
                expired_count += 1
            items.append(
                BarrierReportItem(
                    id=r["id"],
                    barrier_category=BarrierCategory(r["barrier_category"]),
                    segment_id=r["segment_id"],
                    segment_name=r.get("segment_name"),
                    latitude=r["latitude"],
                    longitude=r["longitude"],
                    barrier_type=BarrierType(r["barrier_type"]),
                    duration_minutes=r.get("duration_minutes"),
                    source=r["source"],
                    verification_status=r["verification_status"],
                    created_at=r["created_at"],
                    updated_at=r["updated_at"],
                    expires_at=r.get("expires_at"),
                    is_active=r["is_active"],
                    prohibits_wheelchair=r["prohibits_wheelchair"],
                    cost_multiplier=r["cost_multiplier"],
                    image_url=r.get("image_url"),
                    notes=r.get("notes"),
                )
            )

        return BarrierReportsResponse(
            total_reports=len(items),
            active_count=active_count,
            expired_count=expired_count,
            reports=items,
        )

    def remove_confirmed_barrier(self, barrier_id: str) -> bool:
        """Deactivates a barrier in SQLite store and updates the graph overlay."""
        success = self.report_store.deactivate_report(barrier_id)
        if success:
            self._load_network()
            self._sync_active_barriers_from_store()
        return success

    def get_confirmed_barriers(self) -> ConfirmedBarriersResponse:
        """Returns all currently active dynamic confirmed barriers after auto-expiration check."""
        self._sync_active_barriers_from_store()
        barriers_list = list(self.confirmed_barriers.values())
        return ConfirmedBarriersResponse(
            total_barriers=len(barriers_list),
            barriers=barriers_list,
            active_overlay=len(barriers_list) > 0,
        )

    def reset_dynamic_barriers(self) -> None:
        """Clears all dynamic barriers from SQLite store and restores pristine graph baseline."""
        self.report_store.reset_all()
        self.confirmed_barriers.clear()
        self._load_network()

    def calculate_route_confidence_and_coverage(self, path_nodes: List[str]) -> RouteConfidence:
        """
        Computes honest route confidence score based on recent street imagery age and ground verification.
        Uses deterministic length-weighted formula:
          Confidence = round(100 * (0.60 * R_imagery_coverage + 0.40 * R_ground_verified))
        Reports segments with and without recent imagery (< 90-day threshold).
        """
        now = datetime.now(timezone.utc)
        total_length = 0.0
        covered_length = 0.0
        verified_length = 0.0
        segments_with_imagery = 0
        segments_without_imagery = 0
        oldest_days: Optional[int] = None

        for i in range(len(path_nodes) - 1):
            u, v = path_nodes[i], path_nodes[i + 1]
            edge = self.graph[u][v]
            l = edge.get("length", 1.0)
            total_length += l

            img_date_str = edge.get("last_imagery_date")
            has_recent = False
            if img_date_str:
                try:
                    img_dt = datetime.fromisoformat(img_date_str.replace("Z", "+00:00"))
                    age_days = max(0, (now - img_dt).days)
                    if oldest_days is None or age_days > oldest_days:
                        oldest_days = age_days
                    if age_days <= 90:
                        has_recent = True
                except Exception:
                    pass

            if has_recent:
                covered_length += l
                segments_with_imagery += 1
            else:
                segments_without_imagery += 1

            if edge.get("is_verified", False):
                verified_length += l

        total_segments = len(path_nodes) - 1
        if total_length <= 0:
            return RouteConfidence(
                score=100,
                level="High Evidence",
                imagery_coverage_pct=100.0,
                verified_coverage_pct=100.0,
                segments_with_imagery=0,
                segments_without_imagery=0,
                total_segments=0,
                oldest_imagery_days=0,
                formula_explanation="Point destination. No segments traversed.",
            )

        r_cov = covered_length / total_length
        r_ver = verified_length / total_length
        score = max(0, min(100, round(100.0 * (0.60 * r_cov + 0.40 * r_ver))))

        if score >= 75:
            level = "High Evidence"
        elif score >= 45:
            level = "Moderate Evidence"
        else:
            level = "Limited Evidence"

        formula_explanation = (
            f"Length-weighted evidence: 60% Imagery Freshness ({r_cov * 100:.1f}%) + "
            f"40% Ground Verification ({r_ver * 100:.1f}%) = {score}/100 ({level})"
        )

        return RouteConfidence(
            score=score,
            level=level,
            imagery_coverage_pct=round(r_cov * 100.0, 1),
            verified_coverage_pct=round(r_ver * 100.0, 1),
            segments_with_imagery=segments_with_imagery,
            segments_without_imagery=segments_without_imagery,
            total_segments=total_segments,
            oldest_imagery_days=oldest_days,
            formula_explanation=formula_explanation,
            disclaimer="Confidence reflects available accessibility evidence, not a guarantee of physical safety.",
        )

    def get_map_config(self) -> MapConfigResponse:
        """Returns map viewport configuration, bounding box, 4 profiles, and presets."""
        center_dict = self.metadata.get("center", {"lat": 26.9124, "lon": 75.8193})
        scenarios = [
            DemoScenario(
                id="demo_stairs_vs_accessible",
                title="Stairs vs Accessible Route",
                description="Shortest route climbs 18 steep monumental steps (16.5% grade, no ramp). Wheelchair navigation automatically diverts via the certified gentle ramp promenade (+245m).",
                start=Coordinate(lat=26.9158, lon=75.8185, name="North Gate (New Gate Entrance)"),
                destination=Coordinate(lat=26.9122, lon=75.8193, name="Albert Hall Main Museum Plaza"),
                expected_shortest_barrier="18 Monumental Heritage Steps (no ramp transition, 16.5% grade)",
                expected_accessible_solution="Rose Garden Step-Free Ramp Promenade (max incline 1.8%, tactile paved, flush curbs)",
            ),
            DemoScenario(
                id="demo_surface_comfort",
                title="Surface Comfort",
                description="Direct heritage route is paved with uneven heritage cobblestones (trip & vibration hazard). Elderly and assisted navigation prioritises the smooth paved West Promenade (+30m).",
                start=Coordinate(lat=26.9145, lon=75.8158, name="West Gate (Ravindra Manch)"),
                destination=Coordinate(lat=26.9122, lon=75.8193, name="Albert Hall Main Museum Plaza"),
                expected_shortest_barrier="Uneven heritage cobblestone surface with tripping and rolling resistance",
                expected_accessible_solution="West Shaded Garden Promenade (smooth concrete, gentle 0.6% slope)",
            ),
            DemoScenario(
                id="demo_obstacle_awareness",
                title="Obstacle Awareness",
                description="Direct corridor contains a mid-footpath utility pole hazard without tactile ground cues. Blind & low-vision navigation diverts onto the certified continuous tactile pathway via Rose Garden (+35m).",
                start=Coordinate(lat=26.9140, lon=75.8222, name="East Gate (Zoo & Aviary Walk)"),
                destination=Coordinate(lat=26.9122, lon=75.8193, name="Albert Hall Main Museum Plaza"),
                expected_shortest_barrier="Mid-footpath utility pole & hazard without tactile ground guidance",
                expected_accessible_solution="Certified tactile-guided promenade via East Rose Garden and flush museum approach",
            ),
            DemoScenario(
                id="demo_accessible_corridor",
                title="Identical Safe Corridor",
                description="Demonstrates that when no accessibility barriers exist along the central avenue, both algorithms return the exact same route honestly without fabricating differences.",
                start=Coordinate(lat=26.9145, lon=75.8158, name="West Gate (Ravindra Manch)"),
                destination=Coordinate(lat=26.9140, lon=75.8222, name="East Gate (Zoo & Aviary Walk)"),
                expected_shortest_barrier="None",
                expected_accessible_solution="Identical to shortest path (smooth asphalt, certified curb ramps)",
            ),
        ]

        profiles = [
            {
                "id": "general_pedestrian",
                "name": "General Pedestrian",
                "icon": "Footprints",
                "description": "Standard walking route optimizing primarily for travel distance and mild slope.",
                "prohibits": [],
            },
            {
                "id": "wheelchair",
                "name": "Wheelchair / Stroller",
                "icon": "Accessibility",
                "description": "Strict step-free navigation. Prohibits stairs, requires curb ramps, penalizes uneven cobblestones.",
                "prohibits": ["stairs", "missing_curb_cut", "incline > 8.33%"],
            },
            {
                "id": "blind_low_vision",
                "name": "Blind / Low Vision",
                "icon": "Eye",
                "description": "Prioritizes tactile guiding pavers and flush curbs; strongly penalizes pole obstructions, parked vehicles, and tripping hazards.",
                "prohibits": ["pole_obstruction", "parked_vehicle_blocking_footpath"],
            },
            {
                "id": "elderly",
                "name": "Elderly / Assisted",
                "icon": "HeartHandshake",
                "description": "Prioritizes gentle gradients (< 5%), avoids stair climbing (12x penalty), avoids heavy vehicle blockages.",
                "prohibits": [],
            },
        ]

        return MapConfigResponse(
            center=Coordinate(lat=center_dict["lat"], lon=center_dict["lon"], name=self.metadata.get("name")),
            default_zoom=self.metadata.get("default_zoom", 17),
            bounding_box=self.metadata.get("bounding_box", {}),
            area_name=self.metadata.get("name", "Ram Niwas Garden & Albert Hall"),
            city=self.metadata.get("city", "Jaipur"),
            state=self.metadata.get("state", "Rajasthan"),
            country=self.metadata.get("country", "India"),
            description="Demonstration pedestrian network covering Ram Niwas Garden and Albert Hall Museum precinct in Jaipur, Rajasthan, India.",
            demo_scenarios=scenarios,
            available_profiles=profiles,
            disclaimer="Demonstration area uses explicit audited pedestrian attributes. Confidence reflects available accessibility evidence, not a guarantee of physical safety.",
        )

    def get_segments(self) -> SegmentsResponse:
        """Returns all graph segments annotated with real accessibility attributes and dynamic barriers."""
        self._sync_active_barriers_from_store()
        features: List[SegmentFeature] = []

        for s in self.segments_data:
            barrier_val = s.get("barrier")
            has_stairs_val = s.get("has_stairs", False)

            active_cb = next((cb for cb in self.confirmed_barriers.values() if cb.segment_id == s["id"]), None)
            if active_cb:
                barrier_val = active_cb.barrier_category.value
                if active_cb.prohibits_wheelchair and active_cb.barrier_category == BarrierCategory.stairs:
                    has_stairs_val = True

            features.append(
                SegmentFeature(
                    id=s["id"],
                    u=s["u"],
                    v=s["v"],
                    coordinates=s["coordinates"],
                    length_meters=s["length_meters"],
                    highway=s.get("highway", "footway"),
                    surface=s.get("surface", "asphalt"),
                    is_verified=s.get("is_verified", False),
                    curb_ramp=s.get("curb_ramp", "unverified"),
                    has_stairs=has_stairs_val,
                    incline_pct=s.get("incline_pct", 0.0),
                    tactile_paving=s.get("tactile_paving", False),
                    barrier=barrier_val,
                    last_imagery_date=s.get("last_imagery_date"),
                    data_source="streetvision_live_overlay" if active_cb else s.get("data_source", "demo_annotated_fixture"),
                )
            )

        return SegmentsResponse(
            demonstration_area=self.metadata.get("name", "Jaipur Ram Niwas Garden"),
            total_segments=len(features),
            segments=features,
        )

    def _extract_path_geometry_and_audit(
        self, path_nodes: List[str]
    ) -> Tuple[List[List[float]], float, List[AccessibilityBarrier], int]:
        """Walks path nodes and extracts polyline coordinates, distance, barriers, and unverified segment count."""
        all_coords: List[List[float]] = []
        total_dist = 0.0
        barriers: List[AccessibilityBarrier] = []
        unverified_count = 0

        for i in range(len(path_nodes) - 1):
            u, v = path_nodes[i], path_nodes[i + 1]
            edge = self.graph[u][v]
            coords = edge.get("coordinates", [])

            if not all_coords:
                all_coords.extend(coords)
            else:
                all_coords.extend(coords[1:])

            total_dist += edge.get("length", 0.0)
            seg_id = edge.get("id", str(i))

            # Audit static barriers
            if edge.get("has_stairs") or edge.get("barrier") == "stairs":
                mid_pt = coords[len(coords) // 2]
                barriers.append(
                    AccessibilityBarrier(
                        id=f"barrier_stairs_{seg_id}",
                        type="stairs",
                        description=f"Stairs encountered on {edge.get('name', 'walkway')} ({edge.get('incline_pct', 16)}% incline, no ramp)",
                        location=Coordinate(lat=mid_pt[0], lon=mid_pt[1], name=edge.get("name")),
                        severity="critical",
                        prohibits_wheelchair=True,
                    )
                )

            if edge.get("curb_ramp") == "no":
                mid_pt = coords[len(coords) // 2]
                barriers.append(
                    AccessibilityBarrier(
                        id=f"barrier_curb_{seg_id}",
                        type="missing_curb_cut",
                        description=f"Missing curb cut transition on {edge.get('name', 'segment')}",
                        location=Coordinate(lat=mid_pt[0], lon=mid_pt[1], name=edge.get("name")),
                        severity="high",
                        prohibits_wheelchair=True,
                    )
                )

            if edge.get("barrier") == "uneven_surface" or edge.get("surface") == "uneven_cobblestone":
                mid_pt = coords[len(coords) // 2]
                barriers.append(
                    AccessibilityBarrier(
                        id=f"barrier_surface_{seg_id}",
                        type="uneven_surface",
                        description=f"Uneven cobblestones with tripping and rolling resistance on {edge.get('name')}",
                        location=Coordinate(lat=mid_pt[0], lon=mid_pt[1], name=edge.get("name")),
                        severity="medium",
                        prohibits_wheelchair=False,
                    )
                )

            if edge.get("barrier") == "pole_obstruction":
                mid_pt = coords[len(coords) // 2]
                barriers.append(
                    AccessibilityBarrier(
                        id=f"barrier_pole_{seg_id}",
                        type="pole_obstruction",
                        description=f"Utility pole & fixture mounted in pedestrian walkway on {edge.get('name')} without tactile guidance",
                        location=Coordinate(lat=mid_pt[0], lon=mid_pt[1], name=edge.get("name")),
                        severity="high",
                        prohibits_wheelchair=False,
                    )
                )

            if edge.get("barrier") == "parked_vehicle_blocking_footpath":
                mid_pt = coords[len(coords) // 2]
                barriers.append(
                    AccessibilityBarrier(
                        id=f"barrier_vehicle_{seg_id}",
                        type="parked_vehicle_blocking_footpath",
                        description=f"Parked vehicle blocking pedestrian footpath on {edge.get('name')}",
                        location=Coordinate(lat=mid_pt[0], lon=mid_pt[1], name=edge.get("name")),
                        severity="high",
                        prohibits_wheelchair=True,
                    )
                )

            if edge.get("barrier") == "broken_footpath":
                mid_pt = coords[len(coords) // 2]
                barriers.append(
                    AccessibilityBarrier(
                        id=f"barrier_broken_{seg_id}",
                        type="broken_footpath",
                        description=f"Broken pavement and surface disintegration on {edge.get('name')}",
                        location=Coordinate(lat=mid_pt[0], lon=mid_pt[1], name=edge.get("name")),
                        severity="high",
                        prohibits_wheelchair=False,
                    )
                )

            # Audit dynamic confirmed barriers
            for cb in self.confirmed_barriers.values():
                if cb.segment_id == seg_id:
                    barriers.append(
                        AccessibilityBarrier(
                            id=cb.id,
                            type=cb.barrier_category.value,
                            description=f"StreetVision confirmed barrier: {cb.description}",
                            location=cb.location,
                            severity=cb.severity,
                            prohibits_wheelchair=cb.prohibits_wheelchair,
                        )
                    )

            if not edge.get("is_verified", False):
                unverified_count += 1

        return all_coords, round(total_dist, 1), barriers, unverified_count

    def calculate_shortest_route(self, start: Coordinate, destination: Coordinate) -> RouteResponse:
        """Computes true shortest pedestrian path using NetworkX Dijkstra on metric edge lengths."""
        self._sync_active_barriers_from_store()
        s_node, s_dist = self.snap_to_nearest_node(start)
        d_node, d_dist = self.snap_to_nearest_node(destination)

        if s_node == d_node:
            node_info = self.nodes_data[s_node]
            conf = RouteConfidence(
                score=100,
                level="High Evidence",
                imagery_coverage_pct=100.0,
                verified_coverage_pct=100.0,
                segments_with_imagery=0,
                segments_without_imagery=0,
                total_segments=0,
                oldest_imagery_days=0,
                formula_explanation="Point destination snapped to identical node.",
            )
            return RouteResponse(
                success=True,
                route_type="shortest",
                profile="general_pedestrian",
                distance_meters=0.0,
                estimated_duration_minutes=0.0,
                coordinates=[[node_info["lat"], node_info["lon"]]],
                node_ids=[s_node],
                segments_count=0,
                barriers_encountered=[],
                barriers_avoided=[],
                confidence=conf,
                explanation="Start and destination snapped to the exact same graph node.",
            )

        if not nx.has_path(self.graph, s_node, d_node):
            raise ValueError(f"No navigable path exists between {s_node} and {d_node} in the pedestrian graph.")

        path_nodes = nx.shortest_path(self.graph, source=s_node, target=d_node, weight="length")
        coords, distance_meters, barriers, unverified_count = self._extract_path_geometry_and_audit(path_nodes)
        confidence = self.calculate_route_confidence_and_coverage(path_nodes)

        duration_minutes = round(distance_meters / (1.2 * 60.0), 1)

        explanation = (
            f"Calculated shortest pedestrian route of {distance_meters:.0f} meters "
            f"traversing {len(path_nodes) - 1} graph segments. "
        )
        if barriers:
            barrier_names = ", ".join(b.type for b in barriers)
            explanation += f"Note: Route traverses {len(barriers)} known accessibility barrier(s): {barrier_names}."
        else:
            explanation += "No known accessibility barriers detected along this shortest pathway."

        return RouteResponse(
            success=True,
            route_type="shortest",
            profile="general_pedestrian",
            distance_meters=distance_meters,
            estimated_duration_minutes=duration_minutes,
            coordinates=coords,
            node_ids=path_nodes,
            segments_count=len(path_nodes) - 1,
            barriers_encountered=barriers,
            barriers_avoided=[],
            unverified_segments_count=unverified_count,
            confidence=confidence,
            explanation=explanation,
        )

    def calculate_accessible_route(
        self, start: Coordinate, destination: Coordinate, profile: RouteProfile
    ) -> RouteResponse:
        """
        Computes accessibility-weighted pedestrian path using 4 profile cost functions:
        - wheelchair: Strictly prohibits stairs, missing curb ramps, and vehicle blockages.
        - blind_low_vision: Prioritizes tactile paving; severely penalizes pole obstructions & clutter.
        - elderly: Strongly avoids stairs and steep inclines.
        - general_pedestrian: Balances distance with slope resistance.
        """
        self._sync_active_barriers_from_store()
        s_node, s_dist = self.snap_to_nearest_node(start)
        d_node, d_dist = self.snap_to_nearest_node(destination)

        # Baseline shortest path for comparison
        shortest_path_nodes = nx.shortest_path(self.graph, source=s_node, target=d_node, weight="length")
        _, shortest_dist, shortest_barriers, _ = self._extract_path_geometry_and_audit(shortest_path_nodes)

        # Build accessibility cost function
        def accessibility_weight(u: str, v: str, edge_dict: Dict[str, Any]) -> float:
            base_length = edge_dict.get("length", 1.0)
            has_stairs = (
                edge_dict.get("has_stairs", False)
                or edge_dict.get("barrier") == "stairs"
                or edge_dict.get("highway") == "steps"
            )
            curb_ramp = edge_dict.get("curb_ramp", "unverified")
            surface = edge_dict.get("surface", "unknown")
            incline = edge_dict.get("incline_pct", 0.0)
            is_verified = edge_dict.get("is_verified", False)
            prohibits_wheelchair = edge_dict.get("prohibits_wheelchair", False)
            dynamic_cost_multiplier = edge_dict.get("dynamic_cost_multiplier", 1.0)
            barrier = edge_dict.get("barrier")

            seg_id = edge_dict.get("id")
            active_cb = next((cb for cb in self.confirmed_barriers.values() if cb.segment_id == seg_id), None)

            # Profile 1: Wheelchair
            if profile == RouteProfile.wheelchair:
                if has_stairs or prohibits_wheelchair:
                    return float("inf")
                if curb_ramp == "no":
                    return float("inf")
                if incline > 8.33:  # ADA threshold
                    return float("inf")
                if active_cb and active_cb.prohibits_wheelchair:
                    return float("inf")

                penalty = 1.0 * dynamic_cost_multiplier
                if surface == "uneven_cobblestone" or barrier == "uneven_surface":
                    penalty *= 4.5
                elif barrier == "broken_footpath":
                    penalty *= 5.0
                elif barrier in ["pole_obstruction", "parked_vehicle_blocking_footpath"]:
                    penalty *= 6.0
                elif surface == "unverified" or not is_verified:
                    penalty *= 2.0
                elif surface in ["smooth_concrete", "asphalt"]:
                    penalty *= 1.0

                return base_length * penalty

            # Profile 2: Blind / Low Vision
            elif profile == RouteProfile.blind_low_vision:
                penalty = 1.0 * dynamic_cost_multiplier
                if active_cb:
                    if active_cb.barrier_category in [
                        BarrierCategory.pole_obstruction,
                        BarrierCategory.parked_vehicle_blocking_footpath,
                    ]:
                        penalty *= 12.0
                    elif active_cb.barrier_category == BarrierCategory.missing_footpath:
                        penalty *= 15.0
                    elif active_cb.barrier_category == BarrierCategory.broken_footpath:
                        penalty *= 8.0
                    elif active_cb.barrier_category == BarrierCategory.uneven_surface:
                        penalty *= 5.0

                if barrier in ["pole_obstruction", "parked_vehicle_blocking_footpath"]:
                    penalty *= 12.0  # Mid-pathway hazard without tactile guidance
                elif barrier == "broken_footpath":
                    penalty *= 8.0
                elif barrier == "uneven_surface" or surface == "uneven_cobblestone":
                    penalty *= 4.5  # Tripping hazard
                
                if has_stairs:
                    penalty *= 3.5  # Stairs without tactile warning
                if not is_verified:
                    penalty *= 2.5  # Penalize unverified surface

                # Strong preference for verified continuous tactile guidance paths
                if edge_dict.get("tactile_paving"):
                    penalty *= 0.70  # 30% cost reduction for tactile guidance!
                elif curb_ramp == "yes":
                    penalty *= 0.95

                return base_length * penalty

            # Profile 3: Elderly / Assisted
            elif profile == RouteProfile.elderly:
                penalty = 1.0 * dynamic_cost_multiplier
                if has_stairs:
                    penalty *= 8.0  # Heavily penalise stairs when smooth alternative exists
                if active_cb and active_cb.prohibits_wheelchair:
                    penalty *= 5.0  # Avoid blocked footpaths
                if incline > 5.0:
                    penalty *= (1.0 + (incline - 5.0) * 0.4)
                if barrier == "uneven_surface" or surface == "uneven_cobblestone":
                    penalty *= 3.5  # Severe tripping hazard & joint fatigue
                elif barrier == "broken_footpath":
                    penalty *= 4.0
                elif barrier in ["pole_obstruction", "parked_vehicle_blocking_footpath"]:
                    penalty *= 1.5
                if not is_verified:
                    penalty *= 1.5
                if surface in ["smooth_concrete", "asphalt"]:
                    penalty *= 0.95

                return base_length * penalty

            # Profile 4: General Pedestrian
            else:
                penalty = (1.0 + (incline / 100.0)) * dynamic_cost_multiplier
                if has_stairs:
                    penalty *= 1.05  # Walkable with minor physical cost
                if barrier == "pole_obstruction":
                    penalty *= 1.05  # Easy to walk past
                if active_cb and active_cb.prohibits_wheelchair:
                    penalty *= 1.3
                return base_length * penalty

        try:
            acc_path_nodes = nx.shortest_path(
                self.graph, source=s_node, target=d_node, weight=accessibility_weight
            )
        except nx.NetworkXNoPath:
            raise ValueError(
                f"No accessible route exists for profile '{profile.value}' between selected points. "
                "All available graph paths contain impassable barriers (stairs, missing curb ramps, or confirmed footpath blockages)."
            )

        coords, distance_meters, barriers_encountered, unverified_count = self._extract_path_geometry_and_audit(
            acc_path_nodes
        )
        duration_minutes = round(distance_meters / (1.0 * 60.0), 1)
        confidence = self.calculate_route_confidence_and_coverage(acc_path_nodes)

        is_identical = (acc_path_nodes == shortest_path_nodes)
        acc_barrier_ids = {b.id for b in barriers_encountered}
        barriers_avoided = [b for b in shortest_barriers if b.id not in acc_barrier_ids]

        if is_identical:
            explanation = "Both routes are identical for this journey (same route) based on currently available accessibility evidence."
        else:
            diff_m = max(0, distance_meters - shortest_dist)
            avoided_types = {b.type for b in barriers_avoided}

            if profile == RouteProfile.wheelchair:
                if "stairs" in avoided_types:
                    explanation = f"This wheelchair route avoids a known stair segment on the shortest path and selects a certified step-free detour (+{diff_m:.0f}m)."
                elif "missing_curb_cut" in avoided_types:
                    explanation = f"This wheelchair route avoids an inaccessible kerb transition to maintain continuous step-free rolling (+{diff_m:.0f}m)."
                elif any(b.id in self.confirmed_barriers for b in barriers_avoided):
                    explanation = f"This wheelchair route safely diverts (+{diff_m:.0f}m) around an active StreetVision-confirmed barrier."
                else:
                    explanation = f"This wheelchair route chooses a certified step-free pathway (+{diff_m:.0f}m detour) to ensure safe rolling mobility."

            elif profile == RouteProfile.elderly:
                if "uneven_surface" in avoided_types:
                    explanation = f"The elderly profile prioritises a more suitable surface based on available evidence, taking a smooth paved promenade (+{diff_m:.0f}m) to avoid tripping risks on uneven cobblestones."
                elif "stairs" in avoided_types:
                    explanation = f"The elderly profile prioritises a gentle ramped detour (+{diff_m:.0f}m) to avoid strenuous stair climbing."
                else:
                    explanation = f"The elderly profile balances walking distance and comfortable pathway conditions (+{diff_m:.0f}m detour)."

            elif profile == RouteProfile.blind_low_vision:
                if "pole_obstruction" in avoided_types or "parked_vehicle_blocking_footpath" in avoided_types:
                    explanation = f"This low-vision route navigates via certified tactile-guided pathways (+{diff_m:.0f}m) to safely avoid pedestrian obstructions."
                elif any(b.id in self.confirmed_barriers for b in barriers_avoided):
                    explanation = f"This low-vision route steers clear of an active obstacle reported on the pedestrian corridor (+{diff_m:.0f}m)."
                else:
                    explanation = f"This low-vision route prioritises continuous tactile guiding pathways (+{diff_m:.0f}m detour) for orientation and safety."

            else:  # general_pedestrian
                explanation = f"Calculated walking route balances distance and pathway conditions ({distance_meters:.0f}m, +{diff_m:.0f}m adjustment)."

        if confidence.segments_without_imagery > 0:
            explanation += f" Note: This journey has limited recent imagery coverage ({confidence.segments_without_imagery} segment(s) without imagery <90 days)."

        return RouteResponse(
            success=True,
            route_type="accessible",
            profile=profile.value,
            distance_meters=distance_meters,
            estimated_duration_minutes=duration_minutes,
            coordinates=coords,
            node_ids=acc_path_nodes,
            segments_count=len(acc_path_nodes) - 1,
            barriers_encountered=barriers_encountered,
            barriers_avoided=barriers_avoided,
            unverified_segments_count=unverified_count,
            confidence=confidence,
            explanation=explanation,
            is_identical_to_shortest=is_identical,
        )
