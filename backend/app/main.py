import os
import time
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .routers.health import router as health_router
from .routers.routes import router as routes_router
from .routers.vision import router as vision_router
from .services.health_service import HealthService
from .services.graph_service import GraphService
from .services.vision_service import VisionService

# Load environment variables from .env if present
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

start_time = time.time()

# CORS configuration
raw_cors = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
)
cors_origins = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]
environment = os.getenv("ENVIRONMENT", "development")

app = FastAPI(
    title="PATHWISE AI API",
    description="Accessible pedestrian navigation backend: Beyond Shortest. Towards Safest.",
    version="0.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)

# Attach Services to application state
app.state.health_service = HealthService(
    start_time=start_time,
    environment=environment,
    allowed_origins=cors_origins,
)
app.state.graph_service = GraphService()
app.state.vision_service = VisionService(uploads_dir=uploads_dir)

# Apply CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Uploads
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Mount Routers
app.include_router(health_router)
app.include_router(routes_router)
app.include_router(vision_router)


@app.get("/", summary="Root Platform Information")
async def root():
    """Root info route directing to interactive docs and health check."""
    return {
        "service": "PATHWISE AI",
        "tagline": "Beyond Shortest. Towards Safest.",
        "phase": 3,
        "docs": "/docs",
        "health": "/api/health",
        "diagnostics": "/api/diagnostics",
        "map_config": "/api/map/config",
        "segments": "/api/routes/segments",
        "vision_analyze": "/api/vision/analyze",
        "vision_barriers": "/api/vision/barriers",
    }


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
