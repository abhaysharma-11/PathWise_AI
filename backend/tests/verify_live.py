import subprocess
import time
import urllib.request
import urllib.error
import json

proc = subprocess.Popen(
    ['.venv/Scripts/python.exe', '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
    cwd='c:/Users/asus/OneDrive/Desktop/PathWise_AI/backend'
)

def http_get(url):
    req = urllib.request.Request(url, headers={'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=5) as r:
        return r.status, json.loads(r.read().decode('utf-8'))

def http_post(url, data):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

try:
    # Wait for server startup
    time.sleep(3)
    
    # 1. Health Check
    status, health = http_get('http://127.0.0.1:8000/api/health')
    print('1. HEALTH:', status, 'Phase:', health['phase'], health['service'])
    assert status == 200 and health['phase'] == 2

    # 2. Map Config
    status, config = http_get('http://127.0.0.1:8000/api/map/config')
    print('2. MAP CONFIG:', status, config['city'], config['area_name'], 'Scenarios:', len(config['demo_scenarios']))
    assert status == 200 and config['city'] == 'Jaipur'

    # 3. Segments
    status, segs = http_get('http://127.0.0.1:8000/api/routes/segments')
    print('3. SEGMENTS:', status, 'Total Segments:', segs['total_segments'])
    assert status == 200 and segs['total_segments'] > 10

    # 4. Shortest Route (North Gate -> Albert Hall)
    north_gate = {'lat': 26.9158, 'lon': 75.8185, 'name': 'North Gate'}
    albert_hall = {'lat': 26.9122, 'lon': 75.8193, 'name': 'Albert Hall Plaza'}
    status, shortest = http_post('http://127.0.0.1:8000/api/routes/shortest', {'start': north_gate, 'destination': albert_hall, 'profile': 'general_pedestrian'})
    print('4. SHORTEST ROUTE:', status, f"{shortest['distance_meters']}m", 'Barriers:', len(shortest['barriers_encountered']))
    assert status == 200 and 380 < shortest['distance_meters'] < 450

    # 5. Wheelchair Accessible Route (North Gate -> Albert Hall)
    status, accessible = http_post('http://127.0.0.1:8000/api/routes/accessible', {'start': north_gate, 'destination': albert_hall, 'profile': 'wheelchair'})
    print('5. ACCESSIBLE ROUTE:', status, f"{accessible['distance_meters']}m", 'Avoided:', len(accessible['barriers_avoided']), 'Identical:', accessible['is_identical_to_shortest'])
    assert status == 200 and accessible['is_identical_to_shortest'] is False
    assert any(b['type'] == 'stairs' for b in accessible['barriers_avoided'])

    # 6. Identical Route Check (West Gate -> East Gate)
    west_gate = {'lat': 26.9145, 'lon': 75.8158, 'name': 'West Gate'}
    east_gate = {'lat': 26.9140, 'lon': 75.8222, 'name': 'East Gate'}
    status, identical_acc = http_post('http://127.0.0.1:8000/api/routes/accessible', {'start': west_gate, 'destination': east_gate, 'profile': 'wheelchair'})
    print('6. IDENTICAL ROUTE CHECK:', status, 'Identical:', identical_acc['is_identical_to_shortest'])
    assert status == 200 and identical_acc['is_identical_to_shortest'] is True

    # 7. Out of Bounds Check
    delhi = {'lat': 28.6139, 'lon': 77.2090, 'name': 'Delhi'}
    status, oob = http_post('http://127.0.0.1:8000/api/routes/shortest', {'start': delhi, 'destination': albert_hall, 'profile': 'general_pedestrian'})
    print('7. OUT OF BOUNDS CHECK:', status, oob['detail'])
    assert status == 422

    print('\nALL LIVE HTTP ENDPOINT TESTS PASSED COMPLETELY!')
finally:
    proc.terminate()
