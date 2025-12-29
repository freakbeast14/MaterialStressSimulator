# MatSim

Finite‑element‑powered material and geometry simulation workspace. MatSim lets you
upload geometries, configure boundary conditions, run simulations, and compare
results across materials and tests in a single UI.

## Overview

MatSim Analytics is designed for engineers and material scientists to:
- Browse a library of engineering materials (Steel, Aluminum, Titanium, Polymers)
- Visualize material properties with interactive charts (Stress-Strain curves, Thermal expansion)
- Run simulations to analyze material behavior
- Compare multiple materials side-by-side
- Track simulation results with real-time status updates

## Usage

- Run FEA‑style simulations (stress/strain/deformation) from a web UI.
- Upload/manage materials and geometries (STL/STEP).
- Compare simulations side‑by‑side with charts and metrics.
- View mesh outputs and download artifacts.

## Website

- https://matsim.onrender.com

## Architecture

```mermaid
flowchart LR
  A[Client (React + Vite)] -->|REST| B[Node API (Express)]
  B -->|DB (Postgres)| C[(Database)]
  B -->|Files (local or storage)| D[(Meshes/Geometries)]
  B -->|Jobs| E[FEniCS Service (FastAPI)]
  E -->|Mesh/Results| D
  E -->|Results JSON| B
```

## Tech Stack

- Frontend: React, Vite, Tailwind, Recharts, Plotly
- Backend: Node.js, Express, Drizzle ORM
- FEA Service: Python, FastAPI, FEniCS, meshio, gmsh
- DB: Postgres (Neon/Supabase/etc.)

## Local Setup (Brief)

1) Install dependencies
```bash
npm install
```

2) Configure env vars
```bash
# .env
DATABASE_URL=postgres://...
FENICS_API_URL=http://127.0.0.1:8001
```

3) Run the API + client
```bash
npm run dev
```

4) Run FEniCS service (separate terminal)
```bash
cd fenics_service
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn fenics_service.main:app --host 0.0.0.0 --port 8001
```

## Key User Flows

- Materials: add/edit/delete materials and compare stress‑strain/thermal curves.
- Geometries: upload STL/STEP, preview, and reuse in simulations.
- Simulations: configure BCs, run, view metrics, compare runs.

## Notes

- STL previews are supported in the UI; STEP upload is not yet supported.

<br>

---

**Last Updated:** December 29, 2025
**Version:** 1.0.0