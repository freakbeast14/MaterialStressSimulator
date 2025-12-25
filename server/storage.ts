import { db } from "./db";
import {
  materials,
  simulations,
  type Material,
  type InsertMaterial,
  type Simulation,
  type InsertSimulation,
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
}

export const storage = new DatabaseStorage();