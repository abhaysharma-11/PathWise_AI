from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify GET /api/health meets specifications and reports operational status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "PATHWISE AI"
    assert data["phase"] == 2
    assert "version" in data
    assert "timestamp" in data
    assert "uptime_seconds" in data
    assert data["tagline"] == "Beyond Shortest. Towards Safest."


def test_diagnostics_endpoint():
    """Verify GET /api/diagnostics returns modules and runtime metadata."""
    response = client.get("/api/diagnostics")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert data["phase"] == 2
    assert len(data["modules"]) >= 4


def test_cors_headers():
    """Verify CORS allow headers for allowed frontend origin."""
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
