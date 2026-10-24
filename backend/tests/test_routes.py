from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Known demo coordinates in Ram Niwas Garden Jaipur
NORTH_GATE = {"lat": 26.9158, "lon": 75.8185, "name": "North Gate"}
ALBERT_HALL = {"lat": 26.9122, "lon": 75.8193, "name": "Albert Hall Main Plaza"}
WEST_GATE = {"lat": 26.9145, "lon": 75.8158, "name": "West Gate"}
EAST_GATE = {"lat": 26.9140, "lon": 75.8222, "name": "East Gate"}


def test_get_map_config():
    """Verify GET /api/map/config returns Jaipur center, bounds, scenarios and profiles."""
    response = client.get("/api/map/config")
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "Jaipur"
    assert data["center"]["lat"] == 26.9124
    assert data["center"]["lon"] == 75.8193
    assert len(data["demo_scenarios"]) >= 3
    assert len(data["available_profiles"]) >= 3
    assert "bounding_box" in data


def test_get_segments():
    """Verify GET /api/routes/segments returns graph segments with accessibility data."""
    response = client.get("/api/routes/segments")
    assert response.status_code == 200
    data = response.json()
    assert data["total_segments"] >= 15
    first_seg = data["segments"][0]
    assert "coordinates" in first_seg
    assert len(first_seg["coordinates"]) >= 2
    assert "surface" in first_seg
    assert "curb_ramp" in first_seg
    assert "has_stairs" in first_seg


def test_shortest_route_contains_stairs():
    """
    Verify shortest route between North Gate and Albert Hall takes the direct central
    route across the monumental staircase (~413m) and flags the barrier.
    """
    payload = {
        "start": NORTH_GATE,
        "destination": ALBERT_HALL,
        "profile": "general_pedestrian",
    }
    response = client.post("/api/routes/shortest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["route_type"] == "shortest"
    assert 380.0 < data["distance_meters"] < 450.0
    assert len(data["coordinates"]) >= 5
    # Verify monumental stairs are flagged in barriers_encountered
    stair_barriers = [b for b in data["barriers_encountered"] if b["type"] == "stairs"]
    assert len(stair_barriers) >= 1
    assert "N5_STAIRS_TOP" in data["node_ids"]
    assert "N6_STAIRS_BOTTOM" in data["node_ids"]


def test_wheelchair_accessible_route_avoids_stairs():
    """
    Verify wheelchair profile automatically diverts around monumental stairs via
    the Rose Garden ramped promenade (~658m) and flags stairs as avoided.
    """
    payload = {
        "start": NORTH_GATE,
        "destination": ALBERT_HALL,
        "profile": "wheelchair",
    }
    response = client.post("/api/routes/accessible", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["route_type"] == "accessible"
    assert data["profile"] == "wheelchair"
    # Route distance must be longer than the stair shortcut
    assert 600.0 < data["distance_meters"] < 720.0
    # Must NOT contain stairs in node path
    assert "N5_STAIRS_TOP" not in data["node_ids"]
    assert "N6_STAIRS_BOTTOM" not in data["node_ids"]
    # Must use ramp nodes
    assert "N8_EAST_RAMP_ENTRY" in data["node_ids"]
    assert "N9_EAST_MUSEUM_APPROACH" in data["node_ids"]
    # Verify barriers_avoided reports stairs
    avoided_stairs = [b for b in data["barriers_avoided"] if b["type"] == "stairs"]
    assert len(avoided_stairs) >= 1
    assert data["is_identical_to_shortest"] is False


def test_identical_route_when_no_barriers():
    """
    When traversing between West Gate and East Gate along Central Avenue,
    there are no stairs or barriers, so both algorithms return the exact same route.
    """
    payload = {
        "start": WEST_GATE,
        "destination": EAST_GATE,
        "profile": "wheelchair",
    }
    resp_short = client.post("/api/routes/shortest", json=payload)
    resp_acc = client.post("/api/routes/accessible", json=payload)

    assert resp_short.status_code == 200
    assert resp_acc.status_code == 200

    data_short = resp_short.json()
    data_acc = resp_acc.json()

    assert data_short["node_ids"] == data_acc["node_ids"]
    assert data_acc["is_identical_to_shortest"] is True
    assert "same route" in data_acc["explanation"].lower()


def test_out_of_bounds_coordinate_rejected():
    """Verify points far outside Jaipur demonstration area return 422 error."""
    payload = {
        "start": {"lat": 28.6139, "lon": 77.2090, "name": "New Delhi (Far Out)"},
        "destination": ALBERT_HALL,
        "profile": "wheelchair",
    }
    response = client.post("/api/routes/shortest", json=payload)
    assert response.status_code == 422
    assert "demonstration area" in response.json()["detail"].lower()
