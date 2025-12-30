## MatSim Overview
MatSim is a finite-element simulation workspace for materials and geometries. You upload or select geometry, assign material properties, configure loads and boundary conditions, run simulations, and review results through charts and 3D visualizations. It helps compare runs, understand stress/strain behavior, and make design/material decisions.

## Dashboard
- Purpose: a quick overview of recent activity and a fast entry point to start simulations.
- Sections:
  - Recent Simulations: shows latest runs with status and progress.
  - Material Library: quick access to materials.
  - Geometry Library: quick access to geometries.
- Use cases: check if jobs are running, navigate to the latest results, and jump into create simulation.

## Simulations Page
- Main table: search and filter by material, test type, status, and geometry.
- Sorting: columns can be sorted to prioritize date or other fields.
- Actions: view, edit, run, pause/cancel, delete.
- Status behavior:
  - Pending/running: active jobs.
  - Completed/failed: finished jobs.
  - Updated: parameters changed but not rerun.
- Use cases: manage runs, rerun with updated parameters, compare many runs quickly.

## Simulation Detail Page
- Header:
  - Simulation name, ID, run date, status.
  - Actions like share and export CSV.
- Configuration summary:
  - Material, geometry, test type.
  - Parameters: load, temperature, duration, frequency, damping ratio.
  - Material model: linear or elastic-plastic (yield strength, hardening modulus).
  - Boundary conditions: fixed support and applied loads on faces.
- Key metrics:
  - Max/avg/min stress, stress range.
  - Max deformation, max/avg strain, safety factor.
- Tabs/graphs:
  - Stress-Strain Curve.
  - Stress Distribution.
  - 3D Stress-Displacement Surface.
  - 3D Results Viewer (iso-surface, slice, volume).
- Use cases: interpret results, diagnose high-stress areas, verify design limits.

## Create Simulation
- Steps:
  - Choose material, geometry, test type.
  - Set load/environment/time parameters.
  - Choose material model:
    - Linear: elastic response only.
    - Elastic-plastic: includes yield strength and hardening modulus.
  - Define boundary conditions:
    - Fixed support on a face.
    - Pressure/load on a face with magnitude and unit.
  - Upload geometry (STL) and preview.
  - Run simulation.
- Validation: ensures boundary conditions are valid (e.g., no duplicate load on the same face).

## Compare Simulations
- Available simulations table:
  - Select rows to compare.
  - Shows ID, name, test type, material, geometry, status.
- Key metrics comparison:
  - Side-by-side metrics for selected runs.
- Results comparison tabs:
  - Stress-strain overlays: compare material response curves across runs.
  - Geometry overlays: compare mesh/geometry previews for selected runs.
- Charts:
  - Results Comparison: weighted ranking view that blends stress, safety factor, and deformation using adjustable weights.
  - Overlay curves: compare time-series stress/displacement traces on shared axes and stress-strain overlays to compare material response curves across run.
  - Heatmap: highlights relative metric differences across runs.
  - 3D Metrics Space: scatter of runs across 3 metrics to reveal clusters/tradeoffs.
- Use cases: pick the best-performing configuration, identify outliers.

## Materials
- Library view:
  - Cards for each material with edit/delete.
  - Add new material from popup form.
- Material detail:
  - Stress-strain comparison chart.
  - Thermal expansion comparison chart.
  - Export chart options.
- Use cases: select materials based on stiffness, yield behavior, or thermal expansion.

## Geometries
- Library view:
  - STL previews, file size, created/updated time.
  - Add, edit, delete geometries.
- Geometry detail:
  - Preview and metadata.
- Use cases: manage shapes used across simulations and ensure correct geometry input.

## Settings
- Theme: dark mode toggle.
- Units preferences.
- Additional configuration options for user workflow.

## Charts and How to Use Them
- Stress-Strain Curve:
  - Slope indicates stiffness (Young's modulus).
  - Plateau/curvature indicates yielding/plasticity.
  - Peak stress indicates maximum capacity.
- Stress Distribution:
  - Highlights spatial hotspots.
  - Use to detect high-risk zones.
- 3D Stress-Displacement Surface:
  - Correlates stress and displacement spatially.
  - Useful for structural response interpretation.
- Thermal Expansion:
  - Shows expansion coefficient vs temperature.
  - Compare materials for thermal stability.
- Heatmap (compare):
  - Quick visual comparison across selected runs.
- 3D Metrics Space (compare):
  - Multi-metric tradeoff visualization (e.g., stress vs strain vs safety factor).

## 3D Results Viewer Concepts
- Iso-surface:
  - Shows surfaces of constant field value (stress/displacement).
  - Good for threshold analysis.
- Slice:
  - Planar cut through geometry.
  - Reveals interior gradients.
- Volume:
  - Volumetric rendering for global distribution.
- Playback:
  - Steps through time series states.
  - Use to observe progression of stress/deformation over time.

## Core Simulation Concepts
- Stress/strain: main response metrics of material under load.
- Safety factor: margin against failure.
- Boundary conditions:
  - Fixed supports constrain motion.
  - Pressure/load applies force to faces.
- Material models:
  - Linear: elastic only.
  - Elastic-plastic: yield and hardening behavior.

## Data Model Summary
- Materials:
  - name, category, description, density, Young's modulus, Poisson ratio,
    thermal conductivity, melting point, stress-strain curve, thermal expansion curve.
- Simulations:
  - name, materialId, geometryId, status, type, applied load, temperature,
    duration, frequency, damping ratio, material model, yield strength,
    hardening modulus, progress, paramsDirty, results, created/completed timestamps.
- Geometries:
  - name, originalName, format, storagePath, sizeBytes.
- Simulation meshes:
  - per-simulation mesh artifacts (format, nodes/elements, storage).
- Boundary conditions:
  - per-simulation fixed/pressure with face + magnitude.

## API Routes Summary
- Materials:
  - GET /api/materials
  - POST /api/materials
  - GET /api/materials/:id
  - PUT /api/materials/:id
  - DELETE /api/materials/:id
- Simulations:
  - GET /api/simulations
  - POST /api/simulations
  - GET /api/simulations/:id
  - PUT /api/simulations/:id
  - POST /api/simulations/:id/cancel
  - DELETE /api/simulations/:id
- Geometries:
  - GET /api/geometries
  - POST /api/geometries
  - GET /api/geometries/:id
  - PUT /api/geometries/:id
  - DELETE /api/geometries/:id
  - GET /api/geometries/:id/content
- Simulation meshes:
  - GET /api/simulations/:id/meshes
  - GET /api/simulation-meshes/:id/content
- Boundary conditions:
  - GET /api/simulations/:id/boundary-conditions
  - POST /api/simulations/:id/boundary-conditions
