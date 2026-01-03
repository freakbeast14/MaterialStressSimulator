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
  roles,
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
  type Role,
  type EmailVerificationToken,
} from "@shared/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

export interface IStorage {
  // Roles
  ensureRoles(): Promise<void>;
  getRoles(): Promise<Role[]>;

  // Users
  countUsers(): Promise<number>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(email: string, passwordHash: string, name: string): Promise<User>;
  updateUserProfile(
    id: number,
    data: { name?: string; email?: string; emailVerified?: boolean; roleId?: number },
  ): Promise<User | undefined>;
  updateUserPassword(id: number, passwordHash: string): Promise<User | undefined>;
  softDeleteUser(id: number): Promise<User | undefined>;
  markUserVerified(id: number): Promise<User | undefined>;
  createEmailVerificationToken(userId: number, tokenHash: string, expiresAt: Date): Promise<EmailVerificationToken>;
  getEmailVerificationTokenByHash(tokenHash: string): Promise<EmailVerificationToken | undefined>;
  markEmailVerificationTokenUsed(id: number): Promise<EmailVerificationToken | undefined>;

  // Default materials/geometries
  getDefaultMaterials(): Promise<DefaultMaterial[]>;
  getDefaultMaterial(id: number): Promise<DefaultMaterial | undefined>;
  createDefaultMaterial(material: InsertDefaultMaterial): Promise<DefaultMaterial>;
  updateDefaultMaterial(id: number, material: InsertDefaultMaterial): Promise<DefaultMaterial | undefined>;
  deleteDefaultMaterial(id: number): Promise<boolean>;
  linkDefaultMaterialToUsers(defaultId: number, snapshot: DefaultMaterial): Promise<number>;
  syncDefaultMaterialToUsers(defaultId: number, material: DefaultMaterial): Promise<number>;
  getDefaultGeometries(): Promise<DefaultGeometry[]>;
  getDefaultGeometry(id: number): Promise<DefaultGeometry | undefined>;
  createDefaultGeometry(geometry: InsertDefaultGeometry): Promise<DefaultGeometry>;
  updateDefaultGeometry(id: number, geometry: Partial<InsertDefaultGeometry>): Promise<DefaultGeometry | undefined>;
  deleteDefaultGeometry(id: number): Promise<boolean>;
  linkDefaultGeometryToUsers(defaultId: number, snapshot: DefaultGeometry): Promise<number>;
  syncDefaultGeometryToUsers(defaultId: number, geometry: DefaultGeometry): Promise<number>;

  // Materials
  getMaterials(userId: number): Promise<Material[]>;
  getMaterial(id: number, userId: number): Promise<Material | undefined>;
  getMaterialById(id: number): Promise<Material | undefined>;
  getMaterialsByUser(userId: number): Promise<Material[]>;
  getAllMaterials(): Promise<Material[]>;
  updateMaterialById(id: number, material: InsertMaterial): Promise<Material | undefined>;
  deleteMaterialById(id: number): Promise<boolean>;
  createMaterial(userId: number, material: InsertMaterial & { defaultMaterialId?: number | null }): Promise<Material>;
  updateMaterial(id: number, userId: number, material: InsertMaterial): Promise<Material | undefined>;
  deleteMaterial(id: number, userId: number): Promise<boolean>;

  // Simulations
  getSimulations(userId: number): Promise<Simulation[]>;
  getSimulation(id: number, userId: number): Promise<Simulation | undefined>;
  getSimulationById(id: number): Promise<Simulation | undefined>;
  getSimulationsWithUsers(): Promise<(Simulation & { userName: string | null; userEmail: string })[]>;
  createSimulation(userId: number, simulation: InsertSimulation): Promise<Simulation>;
  updateSimulation(
    id: number,
    userId: number,
    simulation: Partial<InsertSimulation & { status: string; results: any; progress: number; completedAt: Date | null }>
  ): Promise<Simulation | undefined>;
  updateSimulationStatus(id: number, userId: number, status: string, results?: any, progress?: number): Promise<Simulation>;
  updateSimulationById(
    id: number,
    simulation: Partial<InsertSimulation & { status: string; results: any; progress: number; completedAt: Date | null }>
  ): Promise<Simulation | undefined>;
  updateSimulationStatusById(id: number, status: string, results?: any, progress?: number): Promise<Simulation>;
  deleteSimulation(id: number, userId: number): Promise<boolean>;
  softDeleteSimulationById(id: number): Promise<Simulation | undefined>;
  softDeleteSimulationsByUser(userId: number): Promise<number>;
  softDeleteSimulation(id: number, userId: number): Promise<Simulation | undefined>;

  // Geometries
  getGeometries(userId: number): Promise<Geometry[]>;
  getGeometry(id: number, userId: number): Promise<Geometry | undefined>;
  getGeometryById(id: number): Promise<Geometry | undefined>;
  getGeometriesByUser(userId: number): Promise<Geometry[]>;
  getAllGeometries(): Promise<Geometry[]>;
  updateGeometryById(id: number, geometry: Partial<InsertGeometry>): Promise<Geometry | undefined>;
  deleteGeometryById(id: number): Promise<boolean>;
  createGeometry(userId: number, geometry: InsertGeometry & { defaultGeometryId?: number | null }): Promise<Geometry>;
  updateGeometry(id: number, userId: number, geometry: Partial<InsertGeometry>): Promise<Geometry | undefined>;
  deleteGeometry(id: number, userId: number): Promise<boolean>;
  updateGeometryStorage(id: number, userId: number, storagePath: string, sizeBytes: number): Promise<Geometry>;

  // Simulation meshes
  getSimulationMeshes(simulationId: number, userId: number): Promise<SimulationMesh[]>;
  getSimulationMeshesBySimulation(simulationId: number): Promise<SimulationMesh[]>;
  getSimulationMesh(id: number, userId: number): Promise<SimulationMesh | undefined>;
  getSimulationMeshById(id: number): Promise<SimulationMesh | undefined>;
  createSimulationMesh(userId: number, mesh: InsertSimulationMesh): Promise<SimulationMesh>;
  deleteSimulationMeshes(simulationId: number, userId: number): Promise<SimulationMesh[]>;

  // Boundary conditions
  getBoundaryConditions(simulationId: number, userId: number): Promise<SimulationBoundaryCondition[]>;
  getBoundaryConditionsBySimulation(simulationId: number): Promise<SimulationBoundaryCondition[]>;
  createBoundaryCondition(userId: number, condition: InsertSimulationBoundaryCondition): Promise<SimulationBoundaryCondition>;
  deleteBoundaryConditions(simulationId: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async ensureRoles(): Promise<void> {
    const existing = await db.select().from(roles);
    if (existing.length === 0) {
      await db.insert(roles).values([
        { id: 1, name: "User" },
        { id: 2, name: "Admin" },
      ]);
    }
  }

  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(roles.id);
  }

  async countUsers(): Promise<number> {
    const result = await db.select().from(users).where(isNull(users.deletedAt));
    return result.length;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(isNull(users.deletedAt)).orderBy(users.createdAt);
  }

  async createUser(email: string, passwordHash: string, name: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, name, roleId: 1 })
      .returning();
    return user;
  }

  async updateUserProfile(
    id: number,
    data: { name?: string; email?: string; emailVerified?: boolean; roleId?: number },
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return user;
  }

  async updateUserPassword(id: number, passwordHash: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ passwordHash })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return user;
  }

  async softDeleteUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return user;
  }

  async markUserVerified(id: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ emailVerified: true })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
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

  async getDefaultMaterial(id: number): Promise<DefaultMaterial | undefined> {
    const [material] = await db
      .select()
      .from(defaultMaterials)
      .where(eq(defaultMaterials.id, id));
    return material;
  }

  async createDefaultMaterial(insertMaterial: InsertDefaultMaterial): Promise<DefaultMaterial> {
    const [material] = await db
      .insert(defaultMaterials)
      .values(insertMaterial)
      .returning();
    return material;
  }

  async updateDefaultMaterial(
    id: number,
    updateMaterial: InsertDefaultMaterial,
  ): Promise<DefaultMaterial | undefined> {
    const [updated] = await db
      .update(defaultMaterials)
      .set(updateMaterial)
      .where(eq(defaultMaterials.id, id))
      .returning();
    return updated;
  }

  async deleteDefaultMaterial(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(defaultMaterials)
      .where(eq(defaultMaterials.id, id))
      .returning();
    return !!deleted;
  }

  async linkDefaultMaterialToUsers(defaultId: number, snapshot: DefaultMaterial): Promise<number> {
    const updated = await db
      .update(materials)
      .set({ defaultMaterialId: defaultId })
      .where(
        and(
          isNull(materials.defaultMaterialId),
          eq(materials.name, snapshot.name),
          eq(materials.category, snapshot.category),
        ),
      )
      .returning();
    return updated.length;
  }

  async syncDefaultMaterialToUsers(defaultId: number, material: DefaultMaterial): Promise<number> {
    const updated = await db
      .update(materials)
      .set({
        name: material.name,
        category: material.category,
        description: material.description,
        density: material.density,
        youngsModulus: material.youngsModulus,
        poissonRatio: material.poissonRatio,
        thermalConductivity: material.thermalConductivity,
        meltingPoint: material.meltingPoint,
        stressStrainCurve: material.stressStrainCurve,
        thermalExpansionCurve: material.thermalExpansionCurve,
      })
      .where(eq(materials.defaultMaterialId, defaultId))
      .returning();
    return updated.length;
  }

  async getDefaultGeometries(): Promise<DefaultGeometry[]> {
    return await db.select().from(defaultGeometries).orderBy(desc(defaultGeometries.createdAt));
  }

  async getDefaultGeometry(id: number): Promise<DefaultGeometry | undefined> {
    const [geometry] = await db
      .select()
      .from(defaultGeometries)
      .where(eq(defaultGeometries.id, id));
    return geometry;
  }

  async createDefaultGeometry(insertGeometry: InsertDefaultGeometry): Promise<DefaultGeometry> {
    const [geometry] = await db
      .insert(defaultGeometries)
      .values(insertGeometry)
      .returning();
    return geometry;
  }

  async updateDefaultGeometry(
    id: number,
    updateGeometry: Partial<InsertDefaultGeometry>,
  ): Promise<DefaultGeometry | undefined> {
    const [updated] = await db
      .update(defaultGeometries)
      .set(updateGeometry)
      .where(eq(defaultGeometries.id, id))
      .returning();
    return updated;
  }

  async deleteDefaultGeometry(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(defaultGeometries)
      .where(eq(defaultGeometries.id, id))
      .returning();
    return !!deleted;
  }

  async linkDefaultGeometryToUsers(defaultId: number, snapshot: DefaultGeometry): Promise<number> {
    const updated = await db
      .update(geometries)
      .set({ defaultGeometryId: defaultId })
      .where(
        and(
          isNull(geometries.defaultGeometryId),
          eq(geometries.name, snapshot.name),
          eq(geometries.format, snapshot.format),
        ),
      )
      .returning();
    return updated.length;
  }

  async syncDefaultGeometryToUsers(defaultId: number, geometry: DefaultGeometry): Promise<number> {
    const updated = await db
      .update(geometries)
      .set({
        name: geometry.name,
        originalName: geometry.originalName,
        format: geometry.format,
        storagePath: geometry.storagePath,
        sizeBytes: geometry.sizeBytes,
      })
      .where(eq(geometries.defaultGeometryId, defaultId))
      .returning();
    return updated.length;
  }

  async getMaterials(userId: number): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .where(eq(materials.userId, userId))
      .orderBy(materials.name);
  }

  async getMaterialsByUser(userId: number): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .where(eq(materials.userId, userId))
      .orderBy(materials.name);
  }

  async getAllMaterials(): Promise<Material[]> {
    return await db.select().from(materials).orderBy(materials.name);
  }

  async getMaterial(id: number, userId: number): Promise<Material | undefined> {
    const [material] = await db
      .select()
      .from(materials)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)));
    return material;
  }

  async getMaterialById(id: number): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material;
  }

  async createMaterial(
    userId: number,
    insertMaterial: InsertMaterial & { defaultMaterialId?: number | null },
  ): Promise<Material> {
    const [material] = await db
      .insert(materials)
      .values({ ...insertMaterial, userId })
      .returning();
    return material;
  }

  async updateMaterialById(id: number, updateMaterial: InsertMaterial): Promise<Material | undefined> {
    const [updated] = await db
      .update(materials)
      .set({ ...updateMaterial, defaultMaterialId: null })
      .where(eq(materials.id, id))
      .returning();
    return updated;
  }

  async updateMaterial(id: number, userId: number, updateMaterial: InsertMaterial): Promise<Material | undefined> {
    const [updated] = await db
      .update(materials)
      .set({ ...updateMaterial, defaultMaterialId: null })
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

  async deleteMaterialById(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(materials)
      .where(eq(materials.id, id))
      .returning();
    return !!deleted;
  }

  async getSimulations(userId: number): Promise<Simulation[]> {
    return await db
      .select()
      .from(simulations)
      .where(and(eq(simulations.userId, userId), isNull(simulations.deletedAt)))
      .orderBy(desc(simulations.createdAt));
  }

  async getSimulation(id: number, userId: number): Promise<Simulation | undefined> {
    const [simulation] = await db
      .select()
      .from(simulations)
      .where(and(eq(simulations.id, id), eq(simulations.userId, userId), isNull(simulations.deletedAt)));
    return simulation;
  }

  async getSimulationById(id: number): Promise<Simulation | undefined> {
    const [simulation] = await db
      .select()
      .from(simulations)
      .where(and(eq(simulations.id, id), isNull(simulations.deletedAt)));
    return simulation;
  }

  async getSimulationsWithUsers(): Promise<(Simulation & { userName: string | null; userEmail: string })[]> {
    const rows = await db
      .select({
        simulation: simulations,
        userName: users.name,
        userEmail: users.email,
      })
      .from(simulations)
      .leftJoin(users, eq(simulations.userId, users.id))
      .where(isNull(simulations.deletedAt))
      .orderBy(desc(simulations.createdAt));
    return rows.map((row) => ({
      ...row.simulation,
      userName: row.userName ?? null,
      userEmail: row.userEmail ?? "",
    }));
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
      .where(and(eq(simulations.id, id), eq(simulations.userId, userId), isNull(simulations.deletedAt)))
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
      .where(and(eq(simulations.id, id), eq(simulations.userId, userId), isNull(simulations.deletedAt)))
      .returning();
    return updated;
  }

  async deleteSimulation(id: number, userId: number): Promise<boolean> {
    const deleted = await this.softDeleteSimulation(id, userId);
    return !!deleted;
  }

  async updateSimulationById(
    id: number,
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
      .where(and(eq(simulations.id, id), isNull(simulations.deletedAt)))
      .returning();
    return updated;
  }

  async updateSimulationStatusById(
    id: number,
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
      .where(and(eq(simulations.id, id), isNull(simulations.deletedAt)))
      .returning();
    return updated;
  }

  async softDeleteSimulation(id: number, userId: number): Promise<Simulation | undefined> {
    const [deleted] = await db
      .update(simulations)
      .set({ deletedAt: new Date() })
      .where(and(eq(simulations.id, id), eq(simulations.userId, userId), isNull(simulations.deletedAt)))
      .returning();
    return deleted;
  }

  async softDeleteSimulationById(id: number): Promise<Simulation | undefined> {
    const [deleted] = await db
      .update(simulations)
      .set({ deletedAt: new Date() })
      .where(and(eq(simulations.id, id), isNull(simulations.deletedAt)))
      .returning();
    return deleted;
  }

  async softDeleteSimulationsByUser(userId: number): Promise<number> {
    const deleted = await db
      .update(simulations)
      .set({ deletedAt: new Date() })
      .where(and(eq(simulations.userId, userId), isNull(simulations.deletedAt)))
      .returning();
    return deleted.length;
  }

  async getGeometries(userId: number): Promise<Geometry[]> {
    return await db
      .select()
      .from(geometries)
      .where(eq(geometries.userId, userId))
      .orderBy(desc(geometries.createdAt));
  }

  async getGeometriesByUser(userId: number): Promise<Geometry[]> {
    return await db
      .select()
      .from(geometries)
      .where(eq(geometries.userId, userId))
      .orderBy(desc(geometries.createdAt));
  }

  async getAllGeometries(): Promise<Geometry[]> {
    return await db.select().from(geometries).orderBy(desc(geometries.createdAt));
  }

  async getGeometry(id: number, userId: number): Promise<Geometry | undefined> {
    const [geometry] = await db
      .select()
      .from(geometries)
      .where(and(eq(geometries.id, id), eq(geometries.userId, userId)));
    return geometry;
  }

  async getGeometryById(id: number): Promise<Geometry | undefined> {
    const [geometry] = await db.select().from(geometries).where(eq(geometries.id, id));
    return geometry;
  }

  async createGeometry(
    userId: number,
    insertGeometry: InsertGeometry & { defaultGeometryId?: number | null },
  ): Promise<Geometry> {
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
      .set({ ...updateGeometry, defaultGeometryId: null })
      .where(and(eq(geometries.id, id), eq(geometries.userId, userId)))
      .returning();
    return updated;
  }

  async updateGeometryById(
    id: number,
    updateGeometry: Partial<InsertGeometry>,
  ): Promise<Geometry | undefined> {
    const [updated] = await db
      .update(geometries)
      .set({ ...updateGeometry, defaultGeometryId: null })
      .where(eq(geometries.id, id))
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

  async deleteGeometryById(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(geometries)
      .where(eq(geometries.id, id))
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
      .set({ storagePath, sizeBytes, defaultGeometryId: null })
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

  async getSimulationMeshesBySimulation(simulationId: number): Promise<SimulationMesh[]> {
    return await db
      .select()
      .from(simulationMeshes)
      .where(eq(simulationMeshes.simulationId, simulationId))
      .orderBy(desc(simulationMeshes.createdAt));
  }

  async getSimulationMeshById(id: number): Promise<SimulationMesh | undefined> {
    const [mesh] = await db
      .select()
      .from(simulationMeshes)
      .where(eq(simulationMeshes.id, id));
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

  async getBoundaryConditionsBySimulation(
    simulationId: number,
  ): Promise<SimulationBoundaryCondition[]> {
    return await db
      .select()
      .from(simulationBoundaryConditions)
      .where(eq(simulationBoundaryConditions.simulationId, simulationId))
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
