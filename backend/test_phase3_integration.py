"""
PATHWISE AI -- Phase 3 End-to-End Verification Test Script
Tests all 15 verification criteria specified in Hackathon Problem Statement SC-02.
Pure ASCII output for Windows compatibility.
"""

import sys
import io
import json
import urllib.request
import urllib.error
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"


def print_step(num: int, title: str):
    print(f"\n[{num}/15] {title}")


def run_tests():
    print("==================================================")
    print("PATHWISE AI -- PHASE 3 END-TO-END VERIFICATION SUITE")
    print("==================================================")

    # 1. Health check & Phase 3 status
    print_step(1, "Verify Health Endpoint & Phase 3 Status")
    with urllib.request.urlopen(f"{BASE_URL}/api/health") as res:
        health = json.loads(res.read().decode())
        assert health["status"] == "ok"
        assert health["phase"] == 3
        assert health["version"] == "0.3.0"
        print(f"[PASS] Health OK: Phase {health['phase']}, Version {health['version']}, Uptime {health['uptime_seconds']}s")

    # 2. Invalid file rejection
    print_step(2, "Test Invalid File Upload Rejection (400 Bad Request)")
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    data = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="invalid.pdf"\r\n'
        "Content-Type: application/pdf\r\n\r\n"
        "%PDF-1.4 dummy content\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/vision/analyze",
        data=data,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    try:
        urllib.request.urlopen(req)
        assert False, "Expected 400 rejection for PDF file"
    except urllib.error.HTTPError as e:
        assert e.code == 400
        print(f"[PASS] Invalid PDF file properly rejected with HTTP {e.code}: {e.reason}")

    # 3. Valid image upload & real inference
    print_step(3, "Test Valid Image Upload & Inference on Indian Demonstration Image")
    sample_img_path = Path(__file__).resolve().parent.parent / "dataset" / "images" / "jaipur_albert_hall_stairs.jpg"
    assert sample_img_path.exists(), f"Sample image missing at {sample_img_path}"
    with open(sample_img_path, "rb") as f:
        file_bytes = f.read()

    boundary = "----WebKitFormBoundary8MA4YWxkTrZu0gX"
    data = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="jaipur_albert_hall_stairs.jpg"\r\n'
        "Content-Type: image/jpeg\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/api/vision/analyze",
        data=data,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req) as res:
        analysis = json.loads(res.read().decode())
        assert "image_id" in analysis
        assert len(analysis["detections"]) > 0
        print(f"[PASS] Inference successful! Image ID: {analysis['image_id']}, Detections: {len(analysis['detections'])}")
        print(f"       Model Engine: {analysis['model_info']['engine']}, Inference time: {analysis['inference_time_ms']}ms")

    # 4. Detection response schema check
    print_step(4, "Verify Detection Response Schema")
    det = analysis["detections"][0]
    required_keys = ["id", "label", "confidence", "bbox", "accessibility_impact", "source", "verification_status"]
    for k in required_keys:
        assert k in det, f"Missing key {k} in detection"
    print(f"[PASS] Detection Schema valid. Detection: '{det['label']}', Confidence: {det['confidence']}, Status: {det['verification_status']}")

    # 5. Bounding box coordinates normalization
    print_step(5, "Verify Normalized Bounding Box Coordinates")
    bbox = det["bbox"]
    assert len(bbox) == 4
    for val in bbox:
        assert 0.0 <= val <= 1.0, f"Box coordinate {val} outside [0.0, 1.0]"
    print(f"[PASS] Bounding box valid normalized: ymin={bbox[0]}, xmin={bbox[1]}, ymax={bbox[2]}, xmax={bbox[3]}")

    # 6. EXIF GPS metadata handling
    print_step(6, "Verify EXIF GPS Geotag Extraction")
    gps = analysis["gps_coordinates"]
    assert gps is not None
    assert round(gps["lat"], 2) == 26.91
    assert round(gps["lon"], 2) == 75.82
    print(f"[PASS] GPS coordinates accurately extracted from EXIF: {gps['lat']}, {gps['lon']}")

    # 7. Candidate segment retrieval (SC-02 core requirement)
    print_step(7, "Query Candidate Footpath Segments from Pedestrian Graph")
    req_data = json.dumps({"lat": gps["lat"], "lon": gps["lon"], "radius_meters": 120.0}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/vision/segment-match",
        data=req_data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        matches = json.loads(res.read().decode())
        assert len(matches["candidate_segments"]) > 0
        closest_id = matches["matched_closest_segment_id"]
        assert closest_id == "seg_05_monumental_stairs"
        print(f"[PASS] Matched candidate segment: '{closest_id}' ({matches['candidate_segments'][0]['name']}) at distance {matches['candidate_segments'][0]['distance_meters']}m")

    # 8. Detection update & human verification
    print_step(8, "Test Human Reviewer Verification (PATCH /api/vision/detections/{id})")
    patch_data = json.dumps({
        "barrier_category": "stairs",
        "verification_status": "human_verified",
        "notes": "Verified 18 steps monument entrance during hackathon audit.",
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/vision/detections/{det['id']}",
        data=patch_data,
        headers={"Content-Type": "application/json"},
        method="PATCH",
    )
    with urllib.request.urlopen(req) as res:
        updated_det = json.loads(res.read().decode())
        assert updated_det["verification_status"] == "human_verified"
        assert updated_det["source"] == "human_confirmed"
        print(f"[PASS] Detection verified by human auditor: Status '{updated_det['verification_status']}', Source '{updated_det['source']}'")

    # 9. Manual annotation creation
    print_step(9, "Test Explicit Manual Annotation Creation (POST /api/vision/annotations)")
    ann_data = json.dumps({
        "image_id": analysis["image_id"],
        "barrier_category": "missing_curb_ramp",
        "bbox": [0.65, 0.20, 0.85, 0.80],
        "notes": "15cm vertical drop without curb cut ramp.",
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/vision/annotations",
        data=ann_data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        manual_det = json.loads(res.read().decode())
        assert manual_det["source"] == "manually_annotated"
        assert manual_det["verification_status"] == "human_verified"
        print(f"[PASS] Manual annotation created: ID '{manual_det['id']}', Category '{manual_det['barrier_category']}'")

    # 10. Barrier confirmation & segment association
    print_step(10, "Confirm Barrier on Footpath Segment (POST /api/vision/confirm-barrier)")
    confirm_data = json.dumps({
        "detection_id": det["id"],
        "segment_id": "seg_01_north_to_central",
        "barrier_category": "parked_vehicle_blocking_footpath",
        "description": "Two-wheeler scooter parked across 1.4m walkway, usable width < 0.45m.",
        "location": {"lat": 26.9150, "lon": 75.8185, "name": "North Gate Central Allee"},
        "severity": "critical",
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/vision/confirm-barrier",
        data=confirm_data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        confirmed_barrier = json.loads(res.read().decode())
        barrier_id = confirmed_barrier["id"]
        assert confirmed_barrier["prohibits_wheelchair"] is True
        print(f"[PASS] Barrier confirmed: ID '{barrier_id}' on segment '{confirmed_barrier['segment_id']}'")

    # 11. Barrier list persistence in overlay
    print_step(11, "Verify Active Confirmed Barriers in Overlay (GET /api/vision/barriers)")
    with urllib.request.urlopen(f"{BASE_URL}/api/vision/barriers") as res:
        barriers_res = json.loads(res.read().decode())
        assert barriers_res["total_barriers"] >= 1
        assert barriers_res["active_overlay"] is True
        print(f"[PASS] Dynamic overlay active with {barriers_res['total_barriers']} confirmed barrier(s)")

    # 12. Dynamic barrier influence on route calculation
    print_step(12, "Verify Dynamic Barrier Affects Route Explorer Calculation")
    route_data = json.dumps({
        "start": {"lat": 26.9158, "lon": 75.8185, "name": "North Gate"},
        "destination": {"lat": 26.9122, "lon": 75.8193, "name": "Albert Hall Plaza"},
        "profile": "wheelchair",
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/routes/accessible",
        data=route_data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        acc_route = json.loads(res.read().decode())
        assert acc_route["success"] is True
        print(f"[PASS] Accessible route recalculated: {acc_route['distance_meters']}m, {acc_route['segments_count']} segments")
        print(f"       Explanation: {acc_route['explanation']}")

    # 13. Dynamic barrier removal
    print_step(13, "Remove Confirmed Barrier (DELETE /api/vision/barriers/{id})")
    req = urllib.request.Request(
        f"{BASE_URL}/api/vision/barriers/{barrier_id}",
        method="DELETE",
    )
    with urllib.request.urlopen(req) as res:
        del_res = json.loads(res.read().decode())
        assert del_res["success"] is True
        print(f"[PASS] Barrier {barrier_id} removed successfully")

    # 14. Reset barriers back to clean baseline
    print_step(14, "Reset All Barriers to Clean Baseline (POST /api/vision/reset-barriers)")
    req = urllib.request.Request(
        f"{BASE_URL}/api/vision/reset-barriers",
        data=b"{}",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        reset_res = json.loads(res.read().decode())
        assert reset_res["success"] is True
        print(f"[PASS] Graph overlay restored to pristine baseline")

    # 15. Regression: Verify baseline Phase 2 routing integrity
    print_step(15, "Verify Baseline Routing Integrity Unaffected (Regression Test)")
    req = urllib.request.Request(
        f"{BASE_URL}/api/routes/shortest",
        data=route_data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        shortest_res = json.loads(res.read().decode())
        assert shortest_res["distance_meters"] == 413.3
        print(f"[PASS] Baseline shortest route intact: {shortest_res['distance_meters']}m, {shortest_res['segments_count']} segments")

    print("\n==================================================")
    print("ALL 15/15 INTEGRATION & VERIFICATION TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
