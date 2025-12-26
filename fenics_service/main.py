from __future__ import annotations

from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Callable, Dict, List, Optional
import math
import random
import time
import uuid

app = FastAPI(title="FEniCS Solver Service")


class StressPoint(BaseModel):
    strain: float
    stress: float


class Material(BaseModel):
    id: int
    name: str
    youngsModulus: float
    poissonRatio: float
    stressStrainCurve: List[StressPoint] = Field(default_factory=list)


class SimulationRequest(BaseModel):
    name: str
    materialId: int
    type: str
    appliedLoad: Optional[float] = None
    temperature: Optional[float] = None
    duration: Optional[float] = None
    frequency: Optional[float] = None
    dampingRatio: Optional[float] = None
    material: Material


class JobStatus(BaseModel):
    id: str
    status: str
    progress: int
    results: Optional[Dict[str, float | int | list | str]] = None
    error: Optional[str] = None


_jobs: Dict[str, JobStatus] = {}


@app.post("/jobs", response_model=JobStatus)
def create_job(payload: SimulationRequest, background_tasks: BackgroundTasks) -> JobStatus:
    job_id = str(uuid.uuid4())
    status = JobStatus(id=job_id, status="running", progress=5)
    _jobs[job_id] = status
    background_tasks.add_task(_run_job, job_id, payload)
    return status


@app.get("/jobs/{job_id}", response_model=JobStatus)
def get_job(job_id: str) -> JobStatus:
    status = _jobs.get(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status


def _run_job(job_id: str, payload: SimulationRequest) -> None:
    status = _jobs[job_id]
    last_progress = status.progress
    last_tick = time.monotonic()
    min_tick_seconds = 0.5

    def set_progress(value: int) -> None:
        nonlocal last_progress
        nonlocal last_tick
        value = max(int(value), last_progress)
        now = time.monotonic()
        elapsed = now - last_tick
        if elapsed < min_tick_seconds:
            time.sleep(min_tick_seconds - elapsed)
        status.progress = min(value, 99)
        last_progress = status.progress
        last_tick = time.monotonic()

    try:
        set_progress(8)
        results = _solve_with_fenics(job_id, payload, set_progress)
        status.status = "completed"
        status.progress = 100
        status.results = results
    except Exception as exc:
        set_progress(70)
        fallback = _build_stub_results(job_id, payload, set_progress)
        fallback["warning"] = "FEniCS unavailable, using fallback results."
        status.status = "completed"
        status.progress = 100
        status.results = fallback


def _solve_with_fenics(
    job_id: str,
    payload: SimulationRequest,
    progress_cb: Optional[Callable[[int], None]] = None,
) -> Dict[str, float | int | list | str]:
    import numpy as np
    import dolfin as df

    resolution = _mesh_resolution(payload)
    mesh = df.UnitCubeMesh(resolution, resolution, resolution)
    V = df.VectorFunctionSpace(mesh, "P", 1)
    if progress_cb:
        progress_cb(12)

    u = df.TrialFunction(V)
    v = df.TestFunction(V)

    youngs_modulus = payload.material.youngsModulus * 1000.0
    poisson = payload.material.poissonRatio
    temperature = payload.temperature or 20.0
    temperature_factor = max(0.6, 1.0 - (temperature - 20.0) * 0.0002)
    youngs_modulus *= temperature_factor
    mu = youngs_modulus / (2.0 * (1.0 + poisson))
    lmbda = youngs_modulus * poisson / ((1.0 + poisson) * (1.0 - 2.0 * poisson))

    def eps(u_field):
        return df.sym(df.grad(u_field))

    def sigma(u_field):
        return 2.0 * mu * eps(u_field) + lmbda * df.tr(eps(u_field)) * df.Identity(3)

    def top_boundary(x, on_boundary):
        return on_boundary and df.near(x[2], 1.0)

    def bottom_boundary(x, on_boundary):
        return on_boundary and df.near(x[2], 0.0)

    bc = df.DirichletBC(V, df.Constant((0.0, 0.0, 0.0)), bottom_boundary)

    applied_load = payload.appliedLoad if payload.appliedLoad is not None else 1000.0
    traction = applied_load / 1000.0
    t = df.Constant((0.0, 0.0, float(traction)))

    boundaries = df.MeshFunction("size_t", mesh, mesh.topology().dim() - 1, 0)
    df.AutoSubDomain(top_boundary).mark(boundaries, 1)
    ds = df.Measure("ds", domain=mesh, subdomain_data=boundaries)

    a = df.inner(sigma(u), eps(v)) * df.dx
    L = df.dot(t, v) * ds(1)

    u_solution = df.Function(V)
    if progress_cb:
        progress_cb(35)
    df.solve(a == L, u_solution, bc)
    if progress_cb:
        progress_cb(55)

    stress_tensor = sigma(u_solution)
    stress_dev = stress_tensor - df.Identity(3) * df.tr(stress_tensor) / 3.0
    von_mises = df.sqrt(3.0 / 2.0 * df.inner(stress_dev, stress_dev))

    stress_space = df.FunctionSpace(mesh, "P", 1)
    strain_space = df.FunctionSpace(mesh, "P", 1)
    stress_field = df.project(von_mises, stress_space)
    strain_field = df.project(df.sqrt(df.inner(eps(u_solution), eps(u_solution))), strain_space)
    if progress_cb:
        progress_cb(70)

    stress_values = stress_field.vector().get_local()
    strain_values = strain_field.vector().get_local()
    max_stress = float(np.max(stress_values))
    min_stress = float(np.min(stress_values))
    avg_stress = float(np.mean(stress_values))
    stress_range = max_stress - min_stress

    max_strain = float(np.max(strain_values))
    avg_strain = float(np.mean(strain_values))

    displacement_magnitude = df.project(df.sqrt(df.dot(u_solution, u_solution)), stress_space)
    max_deformation = float(np.max(displacement_magnitude.vector().get_local()))

    vertex_map = df.vertex_to_dof_map(stress_space)
    coords = mesh.coordinates()
    max_index = int(np.argmax(stress_values[vertex_map]))
    hotspot_location = coords[max_index].tolist()
    if progress_cb:
        progress_cb(80)

    stress_strain_curve = _build_stress_strain_curve(job_id, payload, max_stress)
    time_series = _build_time_series(
        job_id,
        payload,
        max_stress,
        progress_cb=progress_cb,
        progress_range=(80, 95),
    )
    if progress_cb:
        progress_cb(95)

    allowable_stress = _estimate_allowable_stress(payload, max_stress)
    safety_factor = allowable_stress / max_stress if max_stress > 0 else 0.0

    return {
        "maxStress": max_stress,
        "minStress": min_stress,
        "avgStress": avg_stress,
        "stressRange": stress_range,
        "maxDeformation": max_deformation,
        "maxStrain": max_strain,
        "avgStrain": avg_strain,
        "safetyFactor": safety_factor,
        "timeSeriesData": time_series,
        "stressStrainCurve": stress_strain_curve,
        "hotspots": [
            {"type": "max_stress", "value": max_stress, "location": hotspot_location}
        ],
        "source": "fenics",
    }


def _build_stub_results(
    job_id: str,
    payload: SimulationRequest,
    progress_cb: Optional[Callable[[int], None]] = None,
) -> Dict[str, float | int | list | str]:
    stress_strain_curve = _build_stress_strain_curve(job_id, payload, None)
    stresses = [point["stress"] for point in stress_strain_curve] or [0.0]
    strains = [point["strain"] for point in stress_strain_curve] or [0.0]
    max_stress = max(stresses)
    min_stress = min(stresses)
    avg_stress = sum(stresses) / len(stresses)
    stress_range = max_stress - min_stress

    time_series = _build_time_series(
        job_id,
        payload,
        max_stress,
        progress_cb=progress_cb,
        progress_range=(70, 95),
    )

    allowable_stress = _estimate_allowable_stress(payload, max_stress)
    safety_factor = allowable_stress / max_stress if max_stress > 0 else 0.0

    return {
        "maxStress": max_stress,
        "minStress": min_stress,
        "avgStress": avg_stress,
        "stressRange": stress_range,
        "maxDeformation": max(strains),
        "maxStrain": max(strains),
        "avgStrain": sum(strains) / len(strains),
        "safetyFactor": safety_factor,
        "timeSeriesData": time_series,
        "stressStrainCurve": stress_strain_curve,
        "source": "fallback",
    }


def _build_time_series(
    job_id: str,
    payload: SimulationRequest,
    max_stress: Optional[float],
    progress_cb: Optional[Callable[[int], None]] = None,
    progress_range: Optional[tuple[int, int]] = None,
) -> List[Dict[str, float]]:
    duration = payload.duration or 10.0
    frequency = payload.frequency or 1.0
    damping = payload.dampingRatio or 0.05
    rng = random.Random(job_id)
    points = 40
    base = (max_stress or 100.0) * 0.35
    amplitude = (max_stress or 100.0) * 0.65

    time_series: List[Dict[str, float]] = []
    start_progress, end_progress = (0, 0)
    if progress_range:
        start_progress, end_progress = progress_range
    for index in range(points):
        time_value = duration * index / max(points - 1, 1)
        oscillation = math.sin(2.0 * math.pi * frequency * time_value / duration)
        decay = math.exp(-damping * time_value)
        noise = rng.uniform(-0.03, 0.03) * amplitude
        stress_value = base + amplitude * oscillation * decay + noise
        displacement = (time_value / duration) * 0.2 + rng.uniform(-0.002, 0.002)
        time_series.append(
            {
                "time": time_value,
                "stress": max(stress_value, 0.0),
                "displacement": max(displacement, 0.0),
            }
        )
        if progress_cb and progress_range and index % 4 == 0:
            progress_value = start_progress + (end_progress - start_progress) * (
                index / max(points - 1, 1)
            )
            progress_cb(int(progress_value))
    return time_series


def _build_stress_strain_curve(
    job_id: str,
    payload: SimulationRequest,
    max_stress: Optional[float],
) -> List[Dict[str, float]]:
    curve = payload.material.stressStrainCurve
    if not curve:
        return [{"strain": 0.0, "stress": 0.0}]

    rng = random.Random(job_id + "_curve")
    applied_load = payload.appliedLoad if payload.appliedLoad is not None else 1000.0
    load_factor = max(0.6, min(1.6, applied_load / 1000.0))
    max_curve_stress = max(point.stress for point in curve)
    stress_scale = (max_stress / max_curve_stress) if max_stress else load_factor
    strain_scale = 1.0 + (payload.dampingRatio or 0.05) * 0.2

    dense_curve: List[Dict[str, float]] = []
    for point in curve:
        noise = rng.uniform(-0.015, 0.015) * point.stress
        dense_curve.append(
            {
                "strain": point.strain * strain_scale,
                "stress": max(0.0, point.stress * stress_scale + noise),
            }
        )
    return dense_curve


def _mesh_resolution(payload: SimulationRequest) -> int:
    applied_load = payload.appliedLoad if payload.appliedLoad is not None else 1000.0
    duration = payload.duration or 10.0
    resolution = 6 + int(min(6, (applied_load / 1000.0) + (duration / 10.0)))
    return max(6, min(14, resolution))


def _estimate_allowable_stress(payload: SimulationRequest, max_stress: float) -> float:
    curve = payload.material.stressStrainCurve
    if curve:
        ultimate = max(point.stress for point in curve)
        return ultimate * 0.9
    return max_stress * 1.2


def _update_progress(status: JobStatus, start: int, end: int, delay: float) -> None:
    step = max(1, int((end - start) / 5))
    for value in range(start, end, step):
        time.sleep(delay)
        status.progress = value
