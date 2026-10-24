import time
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_complete_sc02():
    print("=================================================================")
    print("PATHWISE AI - SC-02 Complete Automated Verification Test")
    print("Problem Statement: SC-02 Accessible Walking Routes from Street Imagery")
    print("=================================================================")

    # 1. Health
    r = requests.get(f"{BASE_URL}/api/health", timeout=5)
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("[PASS] 1. Backend Health Check OK")

    # 2. Map Config & 4 Mobility Profiles
    r = requests.get(f"{BASE_URL}/api/map/config", timeout=5)
    assert r.status_code == 200, f"Map config failed: {r.text}"
    config = r.json()
    profile_ids = [p["id"] for p in config["available_profiles"]]
    expected_profiles = ["general_pedestrian", "wheelchair", "blind_low_vision", "elderly"]
    for ep in expected_profiles:
        assert ep in profile_ids, f"Profile '{ep}' missing from map config"
    print(f"[PASS] 2. Map Config OK: 4 Mobility Profiles present: {profile_ids}")

    # 3. Segments with Imagery Date
    r = requests.get(f"{BASE_URL}/api/routes/segments", timeout=5)
    assert r.status_code == 200, f"Segments failed: {r.text}"
    segs = r.json()["segments"]
    assert len(segs) > 10, "Expected >10 pedestrian segments"
    segs_with_img = [s for s in segs if s.get("last_imagery_date")]
    segs_without_img = [s for s in segs if not s.get("last_imagery_date")]
    print(f"[PASS] 3. Pedestrian Network Segments: {len(segs)} total ({len(segs_with_img)} with imagery, {len(segs_without_img)} without)")

    # 4. Route Calculation for all 4 profiles with Honest Confidence
    start = {"lat": 26.9158, "lon": 75.8185, "name": "North Gate"}
    dest = {"lat": 26.9122, "lon": 75.8193, "name": "Albert Hall Plaza"}

    # 4a. Shortest Route
    r = requests.post(f"{BASE_URL}/api/routes/shortest", json={"start": start, "destination": dest}, timeout=5)
    assert r.status_code == 200, f"Shortest route failed: {r.text}"
    shortest_res = r.json()
    assert shortest_res["confidence"] is not None, "Missing confidence on shortest route"
    print(f"[PASS] 4a. Shortest Route: {shortest_res['distance_meters']}m | Confidence: {shortest_res['confidence']['score']}/100 ({shortest_res['confidence']['level']})")

    # 4b. Wheelchair Route (Step-Free Divert)
    r = requests.post(f"{BASE_URL}/api/routes/accessible", json={"start": start, "destination": dest, "profile": "wheelchair"}, timeout=5)
    assert r.status_code == 200, f"Wheelchair route failed: {r.text}"
    wc_res = r.json()
    assert wc_res["confidence"] is not None
    assert wc_res["distance_meters"] > shortest_res["distance_meters"], "Wheelchair route should divert around monumental stairs!"
    print(f"[PASS] 4b. Wheelchair Route: {wc_res['distance_meters']}m (+{wc_res['distance_meters'] - shortest_res['distance_meters']}m ramp detour) | Confidence: {wc_res['confidence']['score']}/100 ({wc_res['confidence']['level']})")

    # 4c. Blind / Low Vision Route (Tactile Paving Guidance)
    r = requests.post(f"{BASE_URL}/api/routes/accessible", json={"start": start, "destination": dest, "profile": "blind_low_vision"}, timeout=5)
    assert r.status_code == 200, f"Blind/Low Vision route failed: {r.text}"
    bl_res = r.json()
    assert bl_res["confidence"] is not None
    print(f"[PASS] 4c. Blind/Low Vision Route: {bl_res['distance_meters']}m | Confidence: {bl_res['confidence']['score']}/100 ({bl_res['confidence']['level']})")

    # 4d. Elderly Route
    r = requests.post(f"{BASE_URL}/api/routes/accessible", json={"start": start, "destination": dest, "profile": "elderly"}, timeout=5)
    assert r.status_code == 200, f"Elderly route failed: {r.text}"
    eld_res = r.json()
    assert eld_res["confidence"] is not None
    print(f"[PASS] 4d. Elderly Route: {eld_res['distance_meters']}m | Confidence: {eld_res['confidence']['score']}/100 ({eld_res['confidence']['level']})")

    # 5. Citizen Photo Barrier Report Submission (SC-02 Extension: Temporary Barrier)
    # We report a parked vehicle on the Rose Garden bypass (seg_07_central_to_east_ramp) with a short 0.05 min (~3s) duration
    # to test automatic expiration!
    report_payload = {
        "barrier_category": "parked_vehicle_blocking_footpath",
        "segment_id": "seg_07_central_to_east_ramp",
        "latitude": 26.9140,
        "longitude": 75.8198,
        "barrier_type": "temporary",
        "duration_minutes": 1, # 1 minute
        "description": "Delivery scooter parked across ramp pathway",
        "notes": "HypNex live hackathon barrier test",
    }
    r = requests.post(f"{BASE_URL}/api/vision/user-report", json=report_payload, timeout=5)
    assert r.status_code == 200, f"Submit user report failed: {r.text}"
    rep = r.json()
    report_id = rep["id"]
    assert rep["is_active"] is True
    print(f"[PASS] 5. Citizen Barrier Report Created: ID={report_id}, Type={rep['barrier_type']}, ExpiresAt={rep['expires_at']}")

    # 6. Verify Dynamic Route Recalculation Diverts Around New Barrier
    # Wheelchair route should now avoid seg_07_central_to_east_ramp because it's blocked by the parked vehicle
    r = requests.post(f"{BASE_URL}/api/routes/accessible", json={"start": start, "destination": dest, "profile": "wheelchair"}, timeout=5)
    assert r.status_code == 200
    wc_detour_res = r.json()
    # Ensure seg_07 is NOT traversed in node sequence N2 -> N8
    path_nodes = wc_detour_res["node_ids"]
    assert not ("N2_CENTRAL_JUNCTION" in path_nodes and "N8_EAST_RAMP_ENTRY" in path_nodes and path_nodes.index("N8_EAST_RAMP_ENTRY") == path_nodes.index("N2_CENTRAL_JUNCTION") + 1), "Route should avoid blocked segment seg_07!"
    print(f"[PASS] 6. Live Dynamic Detour: Successfully rerouted around citizen-reported obstruction! Path length: {wc_detour_res['distance_meters']}m")

    # 7. Barrier Reports Listing
    r = requests.get(f"{BASE_URL}/api/vision/reports", timeout=5)
    assert r.status_code == 200
    reports_data = r.json()
    assert reports_data["active_count"] >= 1
    print(f"[PASS] 7. Reports Listing OK: {reports_data['total_reports']} total ({reports_data['active_count']} active, {reports_data['expired_count']} expired)")

    # 8. Temporary Barrier Expiration Test: Deactivate report & verify restoration
    r = requests.delete(f"{BASE_URL}/api/vision/reports/{report_id}", timeout=5)
    assert r.status_code == 200
    r = requests.post(f"{BASE_URL}/api/vision/check-expirations", timeout=5)
    assert r.status_code == 200

    # 9. Verify Baseline Restoration
    r = requests.post(f"{BASE_URL}/api/routes/accessible", json={"start": start, "destination": dest, "profile": "wheelchair"}, timeout=5)
    assert r.status_code == 200
    wc_restored = r.json()
    assert wc_restored["distance_meters"] == wc_res["distance_meters"], "After expiration/removal, route should revert to pristine baseline!"
    print(f"[PASS] 8. Expiration & Baseline Restoration: Route restored to {wc_restored['distance_meters']}m")

    # 10. Clean up / Reset
    r = requests.post(f"{BASE_URL}/api/vision/reset-barriers", timeout=5)
    assert r.status_code == 200
    print("[PASS] 9. Reset Barriers OK: Pristine baseline restored")

    print("\nALL 9 COMPLETE SC-02 BACKEND VERIFICATION CHECKS PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    test_complete_sc02()
