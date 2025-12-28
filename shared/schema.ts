import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // Metal, Polymer, Composite
  description: text("description").notNull(),
  density: doublePrecision("density").notNull(), // kg/m^3
  youngsModulus: doublePrecision("youngs_modulus").notNull(), // GPa
  poissonRatio: doublePrecision("poisson_ratio").notNull(),
  thermalConductivity: doublePrecision("thermal_conductivity").notNull(), // W/(m·K)
  meltingPoint: doublePrecision("melting_point").notNull(), // °C
  
  // Stored as JSON arrays for charting: [{ x: strain, y: stress }]
  stressStrainCurve: jsonb("stress_strain_curve").$type<{ strain: number; stress: number }[]>().notNull(),
  // Stored as JSON arrays for charting: [{ x: temp, y: expansion }]
  thermalExpansionCurve: jsonb("thermal_expansion_curve").$type<{ temperature: number; coefficient: number }[]>().notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const simulations = pgTable("simulations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  materialId: integer("material_id").notNull(),
  geometryId: integer("geometry_id"),
  status: text("status").notNull(), // pending, running, completed, failed
  type: text("type").notNull(), // Tensile Test, Thermal Stress, Fatigue
  
  // Simulation parameters
  appliedLoad: doublePrecision("applied_load"), // N (Newtons)
  temperature: doublePrecision("temperature"), // °C
  duration: doublePrecision("duration"), // seconds
  frequency: doublePrecision("frequency"), // Hz (for fatigue)
  dampingRatio: doublePrecision("damping_ratio"), // unitless
  materialModel: text("material_model").default("linear"), // linear, plastic
  yieldStrength: doublePrecision("yield_strength"), // MPa
  hardeningModulus: doublePrecision("hardening_modulus"), // MPa
  
  // Progress tracking
  progress: integer("progress").default(0), // 0-100%
  
  // Results stored as JSON
  results: jsonb("results").$type<{ 
    maxStress: number; 
    maxDeformation: number;
    safetyFactor: number;
    timeSeriesData: { time: number; stress: number; displacement: number }[] 
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const geometries = pgTable("geometries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  format: text("format").notNull(),
  storagePath: text("storage_path").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const simulationMeshes = pgTable("simulation_meshes", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull(),
  geometryId: integer("geometry_id"),
  name: text("name").notNull(),
  format: text("format").notNull(),
  storagePath: text("storage_path").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  nodeCount: integer("node_count"),
  elementCount: integer("element_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const simulationBoundaryConditions = pgTable("simulation_boundary_conditions", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull(),
  type: text("type").notNull(), // fixed, pressure
  face: text("face").notNull(), // x+, x-, y+, y-, z+, z-
  magnitude: doublePrecision("magnitude"),
  unit: text("unit"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === BASE SCHEMAS ===
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
export const insertSimulationSchema = createInsertSchema(simulations).omit({ id: true, createdAt: true, completedAt: true, results: true, progress: true });
export const insertGeometrySchema = createInsertSchema(geometries).omit({ id: true, createdAt: true });
export const insertSimulationMeshSchema = createInsertSchema(simulationMeshes).omit({ id: true, createdAt: true });
export const insertSimulationBoundaryConditionSchema = createInsertSchema(simulationBoundaryConditions).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type Simulation = typeof simulations.$inferSelect;
export type InsertSimulation = z.infer<typeof insertSimulationSchema>;
export type Geometry = typeof geometries.$inferSelect;
export type InsertGeometry = z.infer<typeof insertGeometrySchema>;
export type SimulationMesh = typeof simulationMeshes.$inferSelect;
export type InsertSimulationMesh = z.infer<typeof insertSimulationMeshSchema>;
export type SimulationBoundaryCondition = typeof simulationBoundaryConditions.$inferSelect;
export type InsertSimulationBoundaryCondition = z.infer<typeof insertSimulationBoundaryConditionSchema>;

export type CreateSimulationRequest = {
  name: string;
  materialId: number;
  type: string;
};

// Response types
export type MaterialResponse = Material;
export type SimulationResponse = Simulation;
