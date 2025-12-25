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
  status: text("status").notNull(), // pending, running, completed, failed
  type: text("type").notNull(), // Tensile Test, Thermal Stress, Fatigue
  
  // Simulation parameters
  appliedLoad: doublePrecision("applied_load"), // N (Newtons)
  temperature: doublePrecision("temperature"), // °C
  duration: doublePrecision("duration"), // seconds
  frequency: doublePrecision("frequency"), // Hz (for fatigue)
  dampingRatio: doublePrecision("damping_ratio"), // unitless
  
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

// === BASE SCHEMAS ===
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
export const insertSimulationSchema = createInsertSchema(simulations).omit({ id: true, createdAt: true, completedAt: true, results: true, progress: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type Simulation = typeof simulations.$inferSelect;
export type InsertSimulation = z.infer<typeof insertSimulationSchema>;

export type CreateSimulationRequest = {
  name: string;
  materialId: number;
  type: string;
};

// Response types
export type MaterialResponse = Material;
export type SimulationResponse = Simulation;