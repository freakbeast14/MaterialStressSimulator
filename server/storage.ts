import { db } from "./db";
import {
  materials,
  simulations,
  geometries,
  defaultMaterials,
  defaultGeometries,
  simulationMeshes,
  simulationBoundaryConditions,
  users,
  emailVerificationTokens,
  type Material,
  type InsertMaterial,
  type DefaultMaterial,
  type InsertDefaultMaterial,
  type Simulation,
  type InsertSimulation,
  type Geometry,
  type InsertGeometry,
  type DefaultGeometry,
  type InsertDefaultGeometry,
  type SimulationMesh,
  type InsertSimulationMesh,
  type SimulationBoundaryCondition,
  type InsertSimulationBoundaryCondition,
  type User,
  type EmailVerificationToken,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  countUsers(): Promise<number>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(email: string, passwordHash: string): Promise<User>;
  updateUserProfile(
    id: number,
    data: { name?: string; email?: string; emailVerified?: boolean },
  ): Promise<User | undefined>;
  updateUserPassword(id: number, passwordHash: string): Promise<User | undefined>;
  markUserVerified(id: number): Promise<User | undefined>;
  createEmailVerificationToken(userId: number, tokenHash: string, expiresAt: Date): Promise<EmailVerificationToken>;
  getEmailVerificationTokenByHash(tokenHash: string): Promise<EmailVerificationToken | undefined>;
  markEmailVerificationTokenUsed(id: number): Promise<EmailVerificationToken | undefined>;

  // Default materials/geometries
  getDefaultMaterials(): Promise<DefaultMaterial[]>;
  createDefaultMaterial(material: InsertDefaultMaterial): Promise<DefaultMaterial>;
  getDefaultGeometries(): Promise<DefaultGeometry[]>;
  createDefaultGeometry(geometry: InsertDefaultGeometry): Promise<DefaultGeometry>;

  // Materials
  getMaterials(userId: number): Promise<Material[]>;
  getMaterial(id: number, userId: number): Promise<Material | undefined>;
  createMaterial(userId: number, material: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, userId: number, material: InsertMaterial): Promise<Material | undefined>;
  deleteMaterial(id: number, userId: number): Promise<boolean>;

  // Simulations
  getSimulations(userId: number): Promise<Simulation[]>;
  getSimulation(id: number, userId: number): Promise<Simulation | undefined>;
  createSimulation(userId: number, simulation: InsertSimulation): Promise<Simulation>;
  updateSimulation(
    id: number,
    userId: number,
    simulation: Partial<InsertSimulation & { status: string; results: any; progress: number; completedAt: Date | null }>
  ): Promise<Simulation | undefined>;
  updateSimulationStatus(id: number, userId: number, status: string, results?: any, progress?: number): Promise<Simulation>;
  deleteSimulation(id: number, userId: number): Promise<boolean>;

  // Geometries
  getGeometries(userId: number): Promise<Geometry[]>;
  getGeometry(id: number, userId: number): Promise<Geometry | undefined>;
  createGeometry(userId: number, geometry: InsertGeometry): Promise<Geometry>;
  updateGeometry(id: number, userId: number, geometry: Partial<InsertGeometry>): Promise<Geometry | undefined>;
  deleteGeometry(id: number, userId: number): Promise<boolean>;
  updateGeometryStorage(id: number, userId: number, storagePath: string, sizeBytes: number): Promise<Geometry>;

  // Simulation meshes
  getSimulationMeshes(simulationId: number, userId: number): Promise<SimulationMesh[]>;
  getSimulationMesh(id: number, userId: number): Promise<SimulationMesh | undefined>;
  createSimulationMesh(userId: number, mesh: InsertSimulationMesh): Promise<SimulationMesh>;
  deleteSimulationMeshes(simulationId: number, userId: number): Promise<SimulationMesh[]>;

  // Boundary conditions
  getBoundaryConditions(simulationId: number, userId: number): Promise<SimulationBoundaryCondition[]>;
  createBoundaryCondition(userId: number, condition: InsertSimulationBoundaryCondition): Promise<SimulationBoundaryCondition>;
  deleteBoundaryConditions(simulationId: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async countUsers(): Promise<number> {
    const result = await db.select().from(users);
    return result.length;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(email: string, passwordHash: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, name: "" })
      .returning();
    return user;
  }

  async updateUserProfile(
    id: number,
    data: { name?: string; email?: string; emailVerified?: boolean },
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: number, passwordHash: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async markUserVerified(id: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createEmailVerificationToken(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<EmailVerificationToken> {
    const [token] = await db
      .insert(emailVerificationTokens)
      .values({ userId, tokenHash, expiresAt })
      .returning();
    return token;
  }

  async getEmailVerificationTokenByHash(tokenHash: string): Promise<EmailVerificationToken | undefined> {
    const [token] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash));
    return token;
  }

  async markEmailVerificationTokenUsed(id: number): Promise<EmailVerificationToken | undefined> {
    const [token] = await db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, id))
      .returning();
    return token;
  }

  async getDefaultMaterials(): Promise<DefaultMaterial[]> {
    return await db.select().from(defaultMaterials).orderBy(defaultMaterials.name);
  }

  async createDefaultMaterial(insertMaterial: InsertDefaultMaterial): Promise<DefaultMaterial> {
    const [material] = await db
      .insert(defaultMaterials)
      .values(insertMaterial)
      .returning();
    return material;
  }

  async getDefaultGeometries(): Promise<DefaultGeometry[]> {
    return await db.select().from(defaultGeometries).orderBy(desc(defaultGeometries.createdAt));
  }

  async createDefaultGeometry(insertGeometry: InsertDefaultGeometry): Promise<DefaultGeometry> {
    const [geometry] = await db
      .insert(defaultGeometries)
      .values(insertGeometry)
      .returning();
    return geometry;
  }

  async getMaterials(userId: number): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .where(eq(materials.userId, userId))
      .orderBy(materials.name);
  }

  async getMaterial(id: number, userId: number): Promise<Material | undefined> {
    const [material] = await db
      .select()
      .from(materials)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)));
    return material;
  }

  async createMaterial(userId: number, insertMaterial: InsertMaterial): Promise<Material> {
    const [material] = await db
      .insert(materials)
      .values({ ...insertMaterial, userId })
      .returning();
    return material;
  }

  async updateMaterial(id: number, userId: number, updateMaterial: InsertMaterial): Promise<Material | undefined> {
    const [updated] = await db
      .update(materials)
      .set(updateMaterial)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)))
      .returning();
    return updated;
  }

  async deleteMaterial(id: number, userId: number): Promise<boolean> {
    const [deleted] = await db
      .delete(materials)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)))
      .returning();
    return !!deleted;
  }

  async getSimulations(userId: number): Promise<Simulation[]> {
    return await db
      .select()
      .from(simulations)
      .where(eq(simulations.userId, userId))
      .orderBy(desc(simulations.createdAt));
  }

  async getSimulation(id: number, userId: number): Promise<Simulation | undefined> {
    const [simulation] = await db
      .select()
      .from(simulations)
      .where(and(eq(simulations.id, id), eq(simulations.userId, userId)));
    return simulation;
  }

  async createSimulation(userId: number, insertSimulation: InsertSimulation): Promise<Simulation> {
    const [simulation] = await db.insert(simulations).values({
      ...insertSimulation,
      userId,
      status: "pending",
      results: null,
    }).returning();
    return simulation;
  }

  async updateSimulation(
    id: number,
    userId: number,
    updateSimulation: Partial<
      InsertSimulation & {
        status: string;
        results: any;
        progress: number;
        completedAt: Date | null;
        paramsDirty: boolean;
      }
    >,
  ): Promise<Simulation | undefined> {
    const [updated] = await db
      .update(simulations)
      .set(updateSimulation)
      .where(and(eq(simulations.id, id), eq(simulations.userId, userId)))
      .returning();
    return updated;
  }

  async updateSimulationStatus(
    id: number,
    userId: number,
    status: string,
    results?: any,
    progress?: number,
  ): Promise<Simulation> {
    const [updated] = await db.update(simulations)
      .set({ 
        status, 
        results: results || null,
        progress: progress ?? 0,
        completedAt: status === "completed" ? new Date() : null 
      })
      .where(and(eq(simulations.id, id), eq(simulations.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSimulation(id: number, userId: number): Promise<boolean> {
    const [deleted] = await db
      .delete(simulations)
      .where(and(eq(simulations.id, id), eq(simulations.userId, userId)))
      .returning();
    return !!deleted;
  }

  async getGeometries(userId: number): Promise<Geometry[]> {
    return await db
      .select()
      .from(geometries)
      .where(eq(geometries.userId, userId))
      .orderBy(desc(geometries.createdAt));
  }

  async getGeometry(id: number, userId: number): Promise<Geometry | undefined> {
    const [geometry] = await db
      .select()
      .from(geometries)
      .where(and(eq(geometries.id, id), eq(geometries.userId, userId)));
    return geometry;
  }

  async createGeometry(userId: number, insertGeometry: InsertGeometry): Promise<Geometry> {
    const [geometry] = await db
      .insert(geometries)
      .values({ ...insertGeometry, userId })
      .returning();
    return geometry;
  }

  async updateGeometry(
    id: number,
    userId: number,
    updateGeometry: Partial<InsertGeometry>,
  ): Promise<Geometry | undefined> {
    const [updated] = await db
      .update(geometries)
      .set(updateGeometry)
      .where(and(eq(geometries.id, id), eq(geometries.userId, userId)))
      .returning();
    return updated;
  }

  async deleteGeometry(id: number, userId: number): Promise<boolean> {
    const [deleted] = await db
      .delete(geometries)
      .where(and(eq(geometries.id, id), eq(geometries.userId, userId)))
      .returning();
    return !!deleted;
  }

  async updateGeometryStorage(
    id: number,
    userId: number,
    storagePath: string,
    sizeBytes: number,
  ): Promise<Geometry> {
    const [updated] = await db
      .update(geometries)
      .set({ storagePath, sizeBytes })
      .where(and(eq(geometries.id, id), eq(geometries.userId, userId)))
      .returning();
    return updated;
  }

  async getSimulationMeshes(simulationId: number, userId: number): Promise<SimulationMesh[]> {
    return await db
      .select()
      .from(simulationMeshes)
      .where(and(eq(simulationMeshes.simulationId, simulationId), eq(simulationMeshes.userId, userId)))
      .orderBy(desc(simulationMeshes.createdAt));
  }

  async getSimulationMesh(id: number, userId: number): Promise<SimulationMesh | undefined> {
    const [mesh] = await db
      .select()
      .from(simulationMeshes)
      .where(and(eq(simulationMeshes.id, id), eq(simulationMeshes.userId, userId)));
    return mesh;
  }

  async createSimulationMesh(userId: number, insertMesh: InsertSimulationMesh): Promise<SimulationMesh> {
    const [mesh] = await db
      .insert(simulationMeshes)
      .values({ ...insertMesh, userId })
      .returning();
    return mesh;
  }

  async deleteSimulationMeshes(simulationId: number, userId: number): Promise<SimulationMesh[]> {
    const deleted = await db
      .delete(simulationMeshes)
      .where(and(eq(simulationMeshes.simulationId, simulationId), eq(simulationMeshes.userId, userId)))
      .returning();
    return deleted;
  }

  async getBoundaryConditions(
    simulationId: number,
    userId: number,
  ): Promise<SimulationBoundaryCondition[]> {
    return await db
      .select()
      .from(simulationBoundaryConditions)
      .where(and(
        eq(simulationBoundaryConditions.simulationId, simulationId),
        eq(simulationBoundaryConditions.userId, userId),
      ))
      .orderBy(desc(simulationBoundaryConditions.createdAt));
  }

  async createBoundaryCondition(
    userId: number,
    insertCondition: InsertSimulationBoundaryCondition,
  ): Promise<SimulationBoundaryCondition> {
    const [condition] = await db
      .insert(simulationBoundaryConditions)
      .values({ ...insertCondition, userId })
      .returning();
    return condition;
  }

  async deleteBoundaryConditions(simulationId: number, userId: number): Promise<void> {
    await db
      .delete(simulationBoundaryConditions)
      .where(and(
        eq(simulationBoundaryConditions.simulationId, simulationId),
        eq(simulationBoundaryConditions.userId, userId),
      ));
  }
}

export const storage = new DatabaseStorage();
