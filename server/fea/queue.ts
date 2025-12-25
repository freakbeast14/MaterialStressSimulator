import { storage } from "../storage";
import { createFenicsJob, getFenicsJob, type FenicsJobInput } from "./fenics-client";

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
    const fenicsJob = await createFenicsJob({
      ...job.input,
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
        await storage.updateSimulationStatus(job.id, "completed", status.results || null, 100);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
