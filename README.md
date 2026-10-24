# PATHWISE AI

> **"Beyond Shortest. Towards Safest."**  
> A hackathon-ready accessible pedestrian navigation platform engineered for the Hypnexis 2026 Hackathon at Manipal University Jaipur.
> 
> **Problem Statement:** SC-02 — Accessible Walking Routes from Street Imagery (Original Problem + Phase 2 Extension + Premium Consumer UX).

---

## 🌟 Solution Overview

Standard navigation platforms (Google Maps, Apple Maps) optimize exclusively for motorized distance or walking time, directing wheelchair users and visually impaired pedestrians onto footpaths obstructed by steep heritage stairs, missing curb ramps, utility poles, uneven stones, and parked scooters.

**PATHWISE AI** solves this with a complete full-stack platform:
1. **Interactive Accessible Routing**: NetworkX pedestrian graph engine serving Jaipur's Ram Niwas Garden & Albert Hall precinct with Dijkstra routing and profile-specific impedance weighting.
2. **Four Mobility Profiles**:
   - ♿ **Wheelchair / Stroller**: Strictly step-free (inf cost for stairs, missing curb ramps, incline > 8.33%, vehicle blockages).
   - 👁️ **Blind / Low Vision**: Strongly prioritizes continuous tactile guidance paths (0.75x bonus); severely penalizes pole obstructions (12x), parked vehicles (12x), missing footpaths (15x), and uneven cobblestones (6x).
   - 🤝 **Elderly / Assisted**: Avoids stairs (12x) and steep inclines > 5% (4x); minimizes tripping hazards.
   - 🚶 **General Pedestrian**: Direct walking with mild slope weighting.
3. **StreetVision AI & Citizen Reporting (SC-02 Extension)**:
   - Real pretrained YOLOv8 nano object detection for mobility-relevant obstacles (vehicles, motorcycles, bicycles).
   - Real EXIF GPS extraction (`piexif`) from uploaded street photography.
   - 7 explicit barrier categories: Stairs, Missing Kerb Ramp, Broken Footpath, Missing Footpath, Pole Obstruction, Parked Vehicle, Uneven Surface.
   - Clear provenance distinction: **AI Suggested**, **Human Confirmed**, and **Manually Reported**.
   - SQLite persistence (`backend/app/data/reports.db`) and dynamic NetworkX graph overlay without corrupting baseline geometry.
4. **Temporary Barrier Lifecycle & Automated Expiration**:
   - Temporary obstacles (parked delivery scooters, street vendors, construction work zones) support configurable expiration: **60 Seconds (Live Hackathon Demo)**, 1 Hour, 24 Hours, 7 Days.
   - When expired, barriers are marked inactive in SQLite, automatically removed from active graph overlay, and the pristine baseline route is restored within 60 seconds without page reload.
5. **Honest Route Confidence & Missing Imagery Coverage**:
   - Deterministic length-weighted evidence formula:
     $$\text{Score} = \text{round}\left(100 \times (0.60 \times R_{\text{imagery}} + 0.40 \times R_{\text{verified}})\right)$$
   - Categorized honestly as **High Evidence** ($\ge 75$), **Moderate Evidence** ($45-74$), or **Limited Evidence** ($< 45$).
   - Explicitly reports traversed segments, segments with recent imagery (< 90-day threshold), and segments with no recent street imagery.
   - Transparent safety disclaimer: *"Confidence reflects available accessibility evidence, not a guarantee of physical safety."*
6. **Simplified Premium UX**:
   - **Page 1: Home (`/`)**: Consumer landing page featuring real demo route comparisons and 3 core feature pillars.
   - **Page 2: Explore Routes (`/route-explorer`)**: Map-first navigation planner with 4 travel modes, 3 display modes (Accessible Route, Shortest Route, Compare Both), honest confidence card, and live 8s barrier polling.
   - **Page 3: Report a Barrier (`/report` & `/street-vision`)**: 4-step reporting wizard (Add Photo $\to$ Identify Problem $\to$ Confirm Location $\to$ Submit Report) with live auto-expiration trigger and active reports management table.

---

## 🖥️ Prototype Output & Application Preview

PATHWISE AI is a functional, locally runnable full-stack prototype developed for **HypNexis 2026**.

The following screenshots demonstrate the application's user experience, accessibility-aware route planning and StreetVision reporting workflow.

### 1. Home — Accessible Navigation Starts Here

A minimal, user-focused landing experience introducing PATHWISE AI and its mission: *Beyond Shortest. Towards Safest.*

![PATHWISE AI Home](screenshots/home.png)

### 2. Explore Routes — Beyond the Shortest Path

The interactive Route Explorer combines four mobility profiles, accessibility-aware navigation, shortest-route comparison, obstacle visualisation and evidence-based route confidence.

![PATHWISE AI Route Explorer](screenshots/route-explorer.png)

### 3. StreetVision AI — See It. Report It. Improve the Route.

StreetVision combines supported AI object detection with human-assisted barrier identification and a four-step citizen-reporting workflow.

**Add Photo → Identify Problem → Confirm Location → Submit Report**

![PATHWISE AI StreetVision](screenshots/streetvision.png)

### Prototype Availability

The complete source code is available in this repository. The application currently runs locally using React/Vite and Python/FastAPI.

**Frontend:** `http://localhost:5173`  
**Backend:** `http://127.0.0.1:8000`

*These are local development addresses, not publicly accessible deployment URLs. Follow the Quick Start Guide to run the application.*

## 🏗️ Architecture Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Leaflet 1.9, React Router v6, Lucide React |
| **Backend** | Python 3.12.10, FastAPI, Uvicorn, SQLite3 (`reports.db`), NetworkX 3.7, Pydantic v2, python-dotenv |
| **Computer Vision** | Ultralytics YOLOv8 nano (`yolov8n.pt`), PyTorch, Pillow, Piexif (EXIF GPS extraction) |
| **Mapping & GIS** | Leaflet 1.9, OpenStreetMap Standard Tiles (No API key needed), Haversine Geodesic Math |
| **Demonstration Area** | Ram Niwas Garden & Albert Hall Cultural Precinct, Jaipur, Rajasthan, India (`26.9124, 75.8193`) |

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.12+
- Node.js 18+ and npm

### 1. Backend Setup & Startup
```powershell
# Navigate to backend directory
cd backend

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start FastAPI server daemon
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Backend API will be live at `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup & Startup
```powershell
# In a new terminal, navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
```
Frontend will be live at `http://localhost:5173`.

---

## 🧪 Automated Verification & Test Suite

Run the full end-to-end SC-02 verification suite testing health, 4 mobility profiles, route confidence formulas, temporary barrier creation, dynamic graph detour, and automatic expiration restoration:

```powershell
cd backend
.\.venv\Scripts\python.exe test_complete_sc02.py
```

Expected output:
```text
=================================================================
PATHWISE AI - SC-02 Complete Automated Verification Test
Problem Statement: SC-02 Accessible Walking Routes from Street Imagery
=================================================================
[PASS] 1. Backend Health Check OK
[PASS] 2. Map Config OK: 4 Mobility Profiles present: ['general_pedestrian', 'wheelchair', 'blind_low_vision', 'elderly']
[PASS] 3. Pedestrian Network Segments: 17 total (15 with imagery, 2 without)
[PASS] 4a. Shortest Route: 413.3m | Confidence: 100/100 (High Evidence)
[PASS] 4b. Wheelchair Route: 658.7m (+245.4m ramp detour) | Confidence: 100/100 (High Evidence)
[PASS] 4c. Blind/Low Vision Route: 658.7m | Confidence: 100/100 (High Evidence)
[PASS] 4d. Elderly Route: 658.7m | Confidence: 100/100 (High Evidence)
[PASS] 5. Citizen Barrier Report Created: ID=usr_..., Type=temporary, ExpiresAt=...
[PASS] 6. Live Dynamic Detour: Successfully rerouted around citizen-reported obstruction! Path length: 1074.0m
[PASS] 7. Reports Listing OK: 1 total (1 active, 0 expired)
[PASS] 8. Expiration & Baseline Restoration: Route restored to 658.7m
[PASS] 9. Reset Barriers OK: Pristine baseline restored

ALL 9 COMPLETE SC-02 BACKEND VERIFICATION CHECKS PASSED SUCCESSFULLY!
```

---

## 🏛️ Demonstration Scenarios (Jaipur Ram Niwas Garden)

1. **Monumental Stairs Avoidance**:
   - Shortest path sends pedestrians down 18 monumental heritage steps (16.5% grade, no ramp).
   - Wheelchair & elderly routing safely detours via the certified step-free Rose Garden ramp promenade.
2. **Tactile Guidance Navigation**:
   - Blind & low-vision routing steers pedestrians along continuous tactile paving tiles, avoiding sidewalk clutter and pole hazards.
3. **Live Citizen Obstacle & Detour**:
   - A user reports a parked delivery scooter blocking the ramp promenade.
   - Within seconds, active wheelchair routing dynamically recalculates around the obstruction.
4. **Temporary Barrier Auto-Expiration**:
   - Using the 60-second live demo expiry, judges can observe the obstacle expire automatically, restoring the baseline optimal route without manual intervention.

---

## 📜 License & Hackathon Context

Developed for **Hypnexis 2026 Hackathon** at **Manipal University Jaipur**.  
Problem Statement: **SC-02 — Accessible Walking Routes from Street Imagery**.  
Tagline: *Beyond Shortest. Towards Safest.*
