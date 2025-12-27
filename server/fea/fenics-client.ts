type FenicsJobStatus = "pending" | "running" | "completed" | "failed";

export type FenicsMaterial = {
  id: number;
  name: string;
  youngsModulus: number;
  poissonRatio: number;
  stressStrainCurve: { strain: number; stress: number }[];
};

export type FenicsGeometry = {
  name: string;
  format: string;
  contentBase64: string;
};

export type FenicsMeshArtifact = {
  name: string;
  format: string;
  contentBase64: string;
  sizeBytes?: number;
  nodeCount?: number;
  elementCount?: number;
};

export type FenicsJobArtifacts = {
  meshes?: FenicsMeshArtifact[];
  logs?: string[];
};

export type FenicsJobInput = {
  name: string;
  materialId: number;
  geometryId?: number | null;
  type: string;
  appliedLoad?: number | null;
  temperature?: number | null;
  duration?: number | null;
  frequency?: number | null;
  dampingRatio?: number | null;
  geometry?: FenicsGeometry;
  material: FenicsMaterial;
};

type FenicsJobResponse = {
  id: string;
  status: FenicsJobStatus;
  progress: number;
  results?: Record<string, unknown>;
  error?: string;
  artifacts?: FenicsJobArtifacts;
};

const DEFAULT_BASE_URL = "http://127.0.0.1:8001";

export async function createFenicsJob(input: FenicsJobInput): Promise<FenicsJobResponse> {
  const baseUrl = process.env.FENICS_API_URL || DEFAULT_BASE_URL;
  const response = await fetch(`${baseUrl}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`FEniCS API create failed: ${response.status}`);
  }

  return (await response.json()) as FenicsJobResponse;
}

export async function getFenicsJob(jobId: string): Promise<FenicsJobResponse> {
  const baseUrl = process.env.FENICS_API_URL || DEFAULT_BASE_URL;
  const response = await fetch(`${baseUrl}/jobs/${jobId}`);

  if (!response.ok) {
    throw new Error(`FEniCS API status failed: ${response.status}`);
  }

  return (await response.json()) as FenicsJobResponse;
}
