import { db } from "./db";
import {
  materials,
  simulations,
  geometries,
  simulationMeshes,
  simulationBoundaryConditions,
  type Material,
  type InsertMaterial,
  type Simulation,
  type InsertSimulation,
  type Geometry,
  type InsertGeometry,
  type SimulationMesh,
  type InsertSimulationMesh,
  type SimulationBoundaryCondition,
  type InsertSimulationBoundaryCondition,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Materials
  getMaterials(): Promise<Material[]>;
  getMaterial(id: number): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;

  // Simulations
  getSimulations(): Promise<Simulation[]>;
  getSimulation(id: number): Promise<Simulation | undefined>;
  createSimulation(simulation: InsertSimulation): Promise<Simulation>;
  updateSimulationStatus(id: number, status: string, results?: any, progress?: number): Promise<Simulation>;
  deleteSimulation(id: number): Promise<boolean>;

  // Geometries
  getGeometries(): Promise<Geometry[]>;
  getGeometry(id: number): Promise<Geometry | undefined>;
  createGeometry(geometry: InsertGeometry): Promise<Geometry>;

  // Simulation meshes
  getSimulationMeshes(simulationId: number): Promise<SimulationMesh[]>;
  getSimulationMesh(id: number): Promise<SimulationMesh | undefined>;
  createSimulationMesh(mesh: InsertSimulationMesh): Promise<SimulationMesh>;

  // Boundary conditions
  getBoundaryConditions(simulationId: number): Promise<SimulationBoundaryCondition[]>;
  createBoundaryCondition(condition: InsertSimulationBoundaryCondition): Promise<SimulationBoundaryCondition>;
}

export class DatabaseStorage implements IStorage {
  async getMaterials(): Promise<Material[]> {
    return await db.select().from(materials).orderBy(materials.name);
  }

  async getMaterial(id: number): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material;
  }

  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    const [material] = await db.insert(materials).values(insertMaterial).returning();
    return material;
  }

  async getSimulations(): Promise<Simulation[]> {
    return await db.select().from(simulations).orderBy(desc(simulations.createdAt));
  }

  async getSimulation(id: number): Promise<Simulation | undefined> {
    const [simulation] = await db.select().from(simulations).where(eq(simulations.id, id));
    return simulation;
  }

  async createSimulation(insertSimulation: InsertSimulation): Promise<Simulation> {
    const [simulation] = await db.insert(simulations).values({
      ...insertSimulation,
      status: "pending",
      results: null,
    }).returning();
    return simulation;
  }

  async updateSimulationStatus(id: number, status: string, results?: any, progress?: number): Promise<Simulation> {
    const [updated] = await db.update(simulations)
      .set({ 
        status, 
        results: results || null,
        progress: progress ?? 0,
        completedAt: status === "completed" ? new Date() : null 
      })
      .where(eq(simulations.id, id))
      .returning();
    return updated;
  }

  async deleteSimulation(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(simulations)
      .where(eq(simulations.id, id))
      .returning();
    return !!deleted;
  }

  async getGeometries(): Promise<Geometry[]> {
    return await db.select().from(geometries).orderBy(desc(geometries.createdAt));
  }

  async getGeometry(id: number): Promise<Geometry | undefined> {
    const [geometry] = await db.select().from(geometries).where(eq(geometries.id, id));
    return geometry;
  }

  async createGeometry(insertGeometry: InsertGeometry): Promise<Geometry> {
    const [geometry] = await db.insert(geometries).values(insertGeometry).returning();
    return geometry;
  }

  async getSimulationMeshes(simulationId: number): Promise<SimulationMesh[]> {
    return await db
      .select()
      .from(simulationMeshes)
      .where(eq(simulationMeshes.simulationId, simulationId))
      .orderBy(desc(simulationMeshes.createdAt));
  }

  async getSimulationMesh(id: number): Promise<SimulationMesh | undefined> {
    const [mesh] = await db.select().from(simulationMeshes).where(eq(simulationMeshes.id, id));
    return mesh;
  }

  async createSimulationMesh(insertMesh: InsertSimulationMesh): Promise<SimulationMesh> {
    const [mesh] = await db.insert(simulationMeshes).values(insertMesh).returning();
    return mesh;
  }

  async getBoundaryConditions(simulationId: number): Promise<SimulationBoundaryCondition[]> {
    return await db
      .select()
      .from(simulationBoundaryConditions)
      .where(eq(simulationBoundaryConditions.simulationId, simulationId))
      .orderBy(desc(simulationBoundaryConditions.createdAt));
  }

  async createBoundaryCondition(
    insertCondition: InsertSimulationBoundaryCondition,
  ): Promise<SimulationBoundaryCondition> {
    const [condition] = await db
      .insert(simulationBoundaryConditions)
      .values(insertCondition)
      .returning();
    return condition;
  }
}

export const storage = new DatabaseStorage();
