import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { materials } from "@shared/schema";
import { enqueueSimulation } from "./fea/queue";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === Materials Routes ===
  app.get(api.materials.list.path, async (req, res) => {
    const allMaterials = await storage.getMaterials();
    res.json(allMaterials);
  });

  app.get(api.materials.get.path, async (req, res) => {
    const material = await storage.getMaterial(Number(req.params.id));
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    res.json(material);
  });

  app.post(api.materials.create.path, async (req, res) => {
    try {
      const input = api.materials.create.input.parse(req.body);
      const material = await storage.createMaterial(input);
      res.status(201).json(material);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === Simulations Routes ===
  app.get(api.simulations.list.path, async (req, res) => {
    const allSimulations = await storage.getSimulations();
    res.json(allSimulations);
  });

  app.get(api.simulations.get.path, async (req, res) => {
    const simulation = await storage.getSimulation(Number(req.params.id));
    if (!simulation) {
      return res.status(404).json({ message: 'Simulation not found' });
    }
    res.json(simulation);
  });

  app.delete(api.simulations.delete.path, async (req, res) => {
    const deleted = await storage.deleteSimulation(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Simulation not found' });
    }
    res.json({ success: true });
  });

  app.post(api.simulations.create.path, async (req, res) => {
    try {
      const input = api.simulations.create.input.parse(req.body);
      const simulation = await storage.createSimulation(input);
      
      if (simulation) {
        enqueueSimulation(simulation.id, input);
      }

      res.status(201).json(simulation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Seed if empty
  await seedDatabase();

  return httpServer;
}

export async function seedDatabase() {
  const existingMaterials = await storage.getMaterials();
  if (existingMaterials.length === 0) {
    // Seed some materials
    await storage.createMaterial({
      name: "Structural Steel ASTM A36",
      category: "Metal",
      description: "Common structural steel used in construction and machinery.",
      density: 7850,
      youngsModulus: 200, // GPa
      poissonRatio: 0.26,
      thermalConductivity: 45,
      meltingPoint: 1425,
      stressStrainCurve: [
        { strain: 0, stress: 0 },
        { strain: 0.001, stress: 200 },
        { strain: 0.002, stress: 250 }, // Yield point approx
        { strain: 0.05, stress: 400 },
        { strain: 0.1, stress: 450 },
        { strain: 0.2, stress: 400 }, // Necking
      ],
      thermalExpansionCurve: [
        { temperature: 20, coefficient: 12 },
        { temperature: 100, coefficient: 12.5 },
        { temperature: 200, coefficient: 13 },
        { temperature: 300, coefficient: 13.6 },
        { temperature: 400, coefficient: 14.2 },
      ]
    });

    await storage.createMaterial({
      name: "Aluminum Alloy 6061-T6",
      category: "Metal",
      description: "Precipitation-hardened aluminum alloy, used in aircraft structures.",
      density: 2700,
      youngsModulus: 68.9, // GPa
      poissonRatio: 0.33,
      thermalConductivity: 167,
      meltingPoint: 582,
      stressStrainCurve: [
        { strain: 0, stress: 0 },
        { strain: 0.002, stress: 240 },
        { strain: 0.004, stress: 270 },
        { strain: 0.06, stress: 310 },
        { strain: 0.12, stress: 290 },
      ],
      thermalExpansionCurve: [
        { temperature: 20, coefficient: 23 },
        { temperature: 100, coefficient: 24 },
        { temperature: 200, coefficient: 25.2 },
        { temperature: 300, coefficient: 26.5 },
      ]
    });

    await storage.createMaterial({
      name: "Titanium Ti-6Al-4V",
      category: "Metal",
      description: "Workhorse titanium alloy for aerospace and biomedical applications.",
      density: 4430,
      youngsModulus: 113.8, // GPa
      poissonRatio: 0.34,
      thermalConductivity: 6.7,
      meltingPoint: 1604,
      stressStrainCurve: [
        { strain: 0, stress: 0 },
        { strain: 0.005, stress: 800 },
        { strain: 0.008, stress: 880 }, // Yield
        { strain: 0.05, stress: 950 },
        { strain: 0.10, stress: 900 },
      ],
      thermalExpansionCurve: [
        { temperature: 20, coefficient: 8.6 },
        { temperature: 100, coefficient: 8.9 },
        { temperature: 300, coefficient: 9.5 },
        { temperature: 500, coefficient: 10.1 },
      ]
    });
    
    await storage.createMaterial({
      name: "Polyetheretherketone (PEEK)",
      category: "Polymer",
      description: "High-performance organic thermoplastic polymer.",
      density: 1320,
      youngsModulus: 3.6, // GPa
      poissonRatio: 0.4,
      thermalConductivity: 0.25,
      meltingPoint: 343,
      stressStrainCurve: [
        { strain: 0, stress: 0 },
        { strain: 0.02, stress: 80 },
        { strain: 0.05, stress: 100 },
        { strain: 0.20, stress: 90 },
      ],
      thermalExpansionCurve: [
        { temperature: 20, coefficient: 45 },
        { temperature: 100, coefficient: 55 },
        { temperature: 150, coefficient: 120 }, // Glass transition area
      ]
    });
  }
}
