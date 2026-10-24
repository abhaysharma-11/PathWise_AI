import urllib.request
import json

base_url = "http://127.0.0.1:8000"

print(f"--- 1. Testing GET {base_url}/api/health ---")
req = urllib.request.Request(f"{base_url}/api/health", headers={"Accept": "application/json"})
with urllib.request.urlopen(req, timeout=5) as resp:
    data = json.loads(resp.read().decode())
    print("Status code:", resp.status)
    print("Health response:", data)
    assert resp.status == 200
    assert data["status"] == "ok"
    assert data["phase"] == 2

print(f"\n--- 2. Testing GET {base_url}/api/map/config ---")
req = urllib.request.Request(f"{base_url}/api/map/config", headers={"Accept": "application/json"})
with urllib.request.urlopen(req, timeout=5) as resp:
    data = json.loads(resp.read().decode())
    print("Status code:", resp.status)
    print("Demo area:", data["area_name"])
    print("Center:", data["center"])
    print("Presets available:", len(data["demo_scenarios"]))
    assert resp.status == 200
    assert len(data["demo_scenarios"]) > 0

print(f"\n--- 3. Testing GET {base_url}/api/routes/segments ---")
req = urllib.request.Request(f"{base_url}/api/routes/segments", headers={"Accept": "application/json"})
with urllib.request.urlopen(req, timeout=5) as resp:
    data = json.loads(resp.read().decode())
    print("Status code:", resp.status)
    print("Total segments:", data["total_segments"])
    print("Sample segment:", data["segments"][0]["id"], data["segments"][0]["surface"])
    assert resp.status == 200
    assert data["total_segments"] > 0

print(f"\n--- 4. Testing POST {base_url}/api/routes/shortest (Albert Hall North -> South) ---")
payload = {
    "start": {"lat": 26.9158, "lon": 75.8185, "name": "North Gate (New Gate Entrance)"},
    "destination": {"lat": 26.9122, "lon": 75.8193, "name": "Albert Hall Main Museum Plaza"},
    "profile": "general_pedestrian"
}
req = urllib.request.Request(
    f"{base_url}/api/routes/shortest",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json", "Accept": "application/json"}
)
with urllib.request.urlopen(req, timeout=5) as resp:
    data = json.loads(resp.read().decode())
    print("Status code:", resp.status)
    print("Shortest distance (m):", data["distance_meters"])
    print("Barriers encountered:", [b["type"] for b in data["barriers_encountered"]])
    assert resp.status == 200
    shortest_dist = data["distance_meters"]
    assert len(data["barriers_encountered"]) > 0  # Should include the stairs!

print(f"\n--- 5. Testing POST {base_url}/api/routes/accessible (Wheelchair Profile) ---")
payload["profile"] = "wheelchair"
req = urllib.request.Request(
    f"{base_url}/api/routes/accessible",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json", "Accept": "application/json"}
)
with urllib.request.urlopen(req, timeout=5) as resp:
    data = json.loads(resp.read().decode())
    print("Status code:", resp.status)
    print("Accessible distance (m):", data["distance_meters"])
    print("Barriers encountered:", data["barriers_encountered"])
    print("Is identical to shortest:", data["is_identical_to_shortest"])
    print("Detour reason:", data["explanation"])
    assert resp.status == 200
    assert len(data["barriers_encountered"]) == 0  # Wheelchair route completely avoids stairs!
    assert data["is_identical_to_shortest"] is False
    assert data["distance_meters"] > shortest_dist

print(f"\n--- 6. Testing POST {base_url}/api/routes/accessible (West Gate -> East Gate: Identical Routes) ---")
payload_identical = {
    "start": {"lat": 26.9145, "lon": 75.8158, "name": "West Gate (Ravindra Manch)"},
    "destination": {"lat": 26.9140, "lon": 75.8222, "name": "East Gate (Zoo & Aviary Walk)"},
    "profile": "wheelchair"
}
req = urllib.request.Request(
    f"{base_url}/api/routes/accessible",
    data=json.dumps(payload_identical).encode("utf-8"),
    headers={"Content-Type": "application/json", "Accept": "application/json"}
)
with urllib.request.urlopen(req, timeout=5) as resp:
    data = json.loads(resp.read().decode())
    print("Status code:", resp.status)
    print("Distance (m):", data["distance_meters"])
    print("Is identical to shortest:", data["is_identical_to_shortest"])
    print("Explanation:", data["explanation"])
    assert resp.status == 200
    assert data["is_identical_to_shortest"] is True

print("\n--- ALL LIVE HTTP ENDPOINT TESTS PASSED SUCCESSFULLY! ---")
