import { storage } from "../storage";
import {
  createFenicsJob,
  getFenicsJob,
  type FenicsJobInput,
  type FenicsMeshArtifact,
} from "./fenics-client";
import fs from "fs/promises";
import path from "path";

type SimulationJob = {
  id: number;
  input: Omit<FenicsJobInput, "material">;
};

const queue: SimulationJob[] = [];
let isProcessing = false;

export function enqueueSimulation(id: number, input: Omit<FenicsJobInput, "material">): void {
  queue.push({ id, input });
  void processQueue();
}

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    if (!job) break;
    await runJob(job);
  }

  isProcessing = false;
}

async function runJob(job: SimulationJob): Promise<void> {
  const material = await storage.getMaterial(job.input.materialId);
  if (!material) {
    await storage.updateSimulationStatus(job.id, "failed", { message: "Material not found" }, 0);
    return;
  }

  await storage.updateSimulationStatus(job.id, "running", null, 5);

  let fenicsJobId: string | null = null;
  try {
    let geometryPayload: FenicsJobInput["geometry"] | undefined;
    if (job.input.geometryId) {
      const geometry = await storage.getGeometry(job.input.geometryId);
      if (!geometry) {
        await storage.updateSimulationStatus(job.id, "failed", { message: "Geometry not found" }, 0);
        return;
      }
      const fileBuffer = await fs.readFile(geometry.storagePath);
      geometryPayload = {
        name: geometry.name,
        format: geometry.format,
        contentBase64: fileBuffer.toString("base64"),
      };
    }

    const fenicsJob = await createFenicsJob({
      ...job.input,
      geometry: geometryPayload,
      material: {
        id: material.id,
        name: material.name,
        youngsModulus: material.youngsModulus,
        poissonRatio: material.poissonRatio,
        stressStrainCurve: material.stressStrainCurve || [],
      },
    });
    fenicsJobId = fenicsJob.id;
  } catch (err) {
    await storage.updateSimulationStatus(job.id, "failed", { message: "FEniCS API unreachable" }, 0);
    return;
  }

  if (!fenicsJobId) {
    await storage.updateSimulationStatus(job.id, "failed", { message: "FEniCS job id missing" }, 0);
    return;
  }

  while (true) {
    try {
      const status = await getFenicsJob(fenicsJobId);
      if (status.status === "completed") {
        if (status.artifacts?.meshes?.length) {
          await persistMeshArtifacts(job.id, job.input.geometryId, status.artifacts.meshes);
        }
        const results = status.results ? { ...status.results } : null;
        if (results && status.artifacts?.logs?.length) {
          (results as Record<string, unknown>).meshWarnings = status.artifacts.logs;
        }
        await storage.updateSimulationStatus(job.id, "completed", results, 100);
        break;
      }
      if (status.status === "failed") {
        await storage.updateSimulationStatus(job.id, "failed", { message: status.error || "FEniCS job failed" }, 0);
        break;
      }
      await storage.updateSimulationStatus(job.id, "running", null, status.progress || 10);
    } catch {
      await storage.updateSimulationStatus(job.id, "failed", { message: "FEniCS status check failed" }, 0);
      break;
    }

    await sleep(1000);
  }
}

async function persistMeshArtifacts(
  simulationId: number,
  geometryId: number | null | undefined,
  meshes: FenicsMeshArtifact[],
): Promise<void> {
  const storageRoot = path.resolve(process.cwd(), "storage", "meshes", String(simulationId));
  await fs.mkdir(storageRoot, { recursive: true });

  for (const [index, mesh] of meshes.entries()) {
    const safeName = (mesh.name || "mesh").replace(/[^a-z0-9-_]+/gi, "_");
    const safeFormat = mesh.format.replace(".", "").toLowerCase();
    const fileName = `${safeName}-${index}.${safeFormat}`;
    const storagePath = path.join(storageRoot, fileName);
    const buffer = Buffer.from(mesh.contentBase64, "base64");
    await fs.writeFile(storagePath, buffer);
    await storage.createSimulationMesh({
      simulationId,
      geometryId: geometryId ?? null,
      name: safeName,
      format: safeFormat,
      storagePath,
      sizeBytes: buffer.length,
      nodeCount: mesh.nodeCount ?? null,
      elementCount: mesh.elementCount ?? null,
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
