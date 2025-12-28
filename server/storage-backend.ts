import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const STORAGE_BACKEND = process.env.STORAGE_BACKEND || "local";
const STORAGE_ROOT = process.env.STORAGE_ROOT
  ? path.resolve(process.env.STORAGE_ROOT)
  : path.resolve(process.cwd(), "storage");
const GEOMETRY_BUCKET = process.env.SUPABASE_GEOMETRY_BUCKET || "geometries";
const MESH_BUCKET = process.env.SUPABASE_MESH_BUCKET || "meshes";

const supabase =
  STORAGE_BACKEND === "supabase"
    ? createClient(
        process.env.SUPABASE_URL || "",
        process.env.SUPABASE_SERVICE_ROLE_KEY || ""
      )
    : null;

function ensureSupabase(): void {
  if (!supabase) return;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase storage configured but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.");
  }
}

function parseSupabasePath(storagePath: string): { bucket: string; key: string } {
  const trimmed = storagePath.replace(/^supabase:/, "");
  const [bucket, ...rest] = trimmed.split("/");
  const key = rest.join("/");
  if (!bucket || !key) {
    throw new Error("Invalid Supabase storage path.");
  }
  return { bucket, key };
}

export async function saveGeometryFile(
  fileName: string,
  buffer: Buffer,
): Promise<{ storagePath: string; sizeBytes: number }> {
  if (STORAGE_BACKEND === "supabase") {
    ensureSupabase();
    const { error } = await supabase!.storage
      .from(GEOMETRY_BUCKET)
      .upload(fileName, buffer, {
        contentType: "application/octet-stream",
        upsert: true,
      });
    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
    return {
      storagePath: `supabase:${GEOMETRY_BUCKET}/${fileName}`,
      sizeBytes: buffer.length,
    };
  }

  const geometryRoot = path.resolve(STORAGE_ROOT, "geometries");
  await fs.mkdir(geometryRoot, { recursive: true });
  const storagePath = path.join(geometryRoot, fileName);
  await fs.writeFile(storagePath, buffer);
  return { storagePath, sizeBytes: buffer.length };
}

export async function saveMeshFile(
  simulationId: number,
  fileName: string,
  buffer: Buffer,
): Promise<{ storagePath: string; sizeBytes: number }> {
  if (STORAGE_BACKEND === "supabase") {
    ensureSupabase();
    const key = `${simulationId}/${fileName}`;
    const { error } = await supabase!.storage
      .from(MESH_BUCKET)
      .upload(key, buffer, {
        contentType: "application/octet-stream",
        upsert: true,
      });
    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
    return {
      storagePath: `supabase:${MESH_BUCKET}/${key}`,
      sizeBytes: buffer.length,
    };
  }

  const meshRoot = path.resolve(STORAGE_ROOT, "meshes", String(simulationId));
  await fs.mkdir(meshRoot, { recursive: true });
  const storagePath = path.join(meshRoot, fileName);
  await fs.writeFile(storagePath, buffer);
  return { storagePath, sizeBytes: buffer.length };
}

export async function readStoragePath(storagePath: string): Promise<Buffer> {
  if (storagePath.startsWith("supabase:")) {
    ensureSupabase();
    const { bucket, key } = parseSupabasePath(storagePath);
    const { data, error } = await supabase!.storage.from(bucket).download(key);
    if (error) {
      throw new Error(error.message);
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  return fs.readFile(storagePath);
}

export async function ensureLocalStorageRoot(): Promise<void> {
  if (STORAGE_BACKEND === "supabase") return;
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
}
