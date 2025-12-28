import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { materials } from "@shared/schema";
import { cancelSimulation, enqueueSimulation } from "./fea/queue";
import {
  ensureLocalStorageRoot,
  readStoragePath,
  saveGeometryFile,
} from "./storage-backend";

const seedGeometries = [
  {
    name: "Unit Cube",
    originalName: "unit-cube.stl",
    format: "stl",
    content: `solid unit_cube
  facet normal 0 0 1
    outer loop
      vertex 0 0 1
      vertex 1 0 1
      vertex 1 1 1
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 1
      vertex 1 1 1
      vertex 0 1 1
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 1 1 0
      vertex 1 0 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 0 1 0
      vertex 1 1 0
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 1 0
      vertex 1 1 1
      vertex 1 1 0
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 1 0
      vertex 0 1 1
      vertex 1 1 1
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 1 0 1
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 1 0 1
      vertex 0 0 1
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 1 0 0
      vertex 1 1 0
      vertex 1 1 1
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 1 0 0
      vertex 1 1 1
      vertex 1 0 1
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 1 1
      vertex 0 1 0
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 0 1
      vertex 0 1 1
    endloop
  endfacet
endsolid unit_cube
`,
  },
  {
    name: "Square Pyramid",
    originalName: "square-pyramid.stl",
    format: "stl",
    content: `solid square_pyramid
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 1 1 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 1 1 0
      vertex 0 1 0
    endloop
  endfacet
  facet normal 0 1 1
    outer loop
      vertex 0 1 0
      vertex 1 1 0
      vertex 0.5 0.5 1
    endloop
  endfacet
  facet normal 1 0 1
    outer loop
      vertex 1 0 0
      vertex 1 1 0
      vertex 0.5 0.5 1
    endloop
  endfacet
  facet normal 0 -1 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0.5 0.5 1
    endloop
  endfacet
  facet normal -1 0 1
    outer loop
      vertex 0 0 0
      vertex 0.5 0.5 1
      vertex 0 1 0
    endloop
  endfacet
endsolid square_pyramid
`,
  },
  {
    name: "Rectangular Plate",
    originalName: "rectangular-plate.stl",
    format: "stl",
    content: `solid rectangular_plate
  facet normal 0 0 1
    outer loop
      vertex 0 0 0.2
      vertex 2 0 0.2
      vertex 2 2 0.2
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 0.2
      vertex 2 2 0.2
      vertex 0 2 0.2
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 2 2 0
      vertex 2 0 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 0 2 0
      vertex 2 2 0
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 2 0
      vertex 2 2 0
      vertex 2 2 0.2
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 2 0
      vertex 2 2 0.2
      vertex 0 2 0.2
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 2 0 0.2
      vertex 2 0 0
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 0 0 0.2
      vertex 2 0 0.2
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 2 0 0
      vertex 2 2 0
      vertex 2 2 0.2
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 2 0 0
      vertex 2 2 0.2
      vertex 2 0 0.2
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 2 0.2
      vertex 0 2 0
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 0 0.2
      vertex 0 2 0.2
    endloop
  endfacet
endsolid rectangular_plate
`,
  },
  {
    name: "Beam",
    originalName: "beam.stl",
    format: "stl",
    content: `solid beam
  facet normal 0 0 1
    outer loop
      vertex 0 0 0.5
      vertex 3 0 0.5
      vertex 3 0.5 0.5
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 0.5
      vertex 3 0.5 0.5
      vertex 0 0.5 0.5
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 3 0.5 0
      vertex 3 0 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 0 0.5 0
      vertex 3 0.5 0
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 0.5 0
      vertex 3 0.5 0
      vertex 3 0.5 0.5
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 0.5 0
      vertex 3 0.5 0.5
      vertex 0 0.5 0.5
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 3 0 0.5
      vertex 3 0 0
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 0 0 0.5
      vertex 3 0 0.5
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 3 0 0
      vertex 3 0.5 0
      vertex 3 0.5 0.5
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 3 0 0
      vertex 3 0.5 0.5
      vertex 3 0 0.5
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 0.5 0.5
      vertex 0 0.5 0
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 0 0.5
      vertex 0 0.5 0.5
    endloop
  endfacet
endsolid beam
`,
  },
  {
    name: "Cylinder",
    originalName: "cylinder.stl",
    format: "stl",
    content: `solid cylinder
  facet normal -0.965926 -0.258819 0.000000
    outer loop
      vertex 10.000000 0.000000 -10.000000
      vertex 10.000000 0.000000 10.000000
      vertex 8.660254 5.000000 10.000000
    endloop
  endfacet
  facet normal -0.965926 -0.258819 0.000000
    outer loop
      vertex 10.000000 0.000000 -10.000000
      vertex 8.660254 5.000000 10.000000
      vertex 8.660254 5.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 10.000000 0.000000 10.000000
      vertex 8.660254 5.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 8.660254 5.000000 -10.000000
      vertex 10.000000 0.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal -0.707107 -0.707107 0.000000
    outer loop
      vertex 8.660254 5.000000 -10.000000
      vertex 8.660254 5.000000 10.000000
      vertex 5.000000 8.660254 10.000000
    endloop
  endfacet
  facet normal -0.707107 -0.707107 0.000000
    outer loop
      vertex 8.660254 5.000000 -10.000000
      vertex 5.000000 8.660254 10.000000
      vertex 5.000000 8.660254 -10.000000
    endloop
  endfacet
  facet normal 0.000000 -0.000000 1.000000
    outer loop
      vertex 8.660254 5.000000 10.000000
      vertex 5.000000 8.660254 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 5.000000 8.660254 -10.000000
      vertex 8.660254 5.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal -0.258819 -0.965926 0.000000
    outer loop
      vertex 5.000000 8.660254 -10.000000
      vertex 5.000000 8.660254 10.000000
      vertex 0.000000 10.000000 10.000000
    endloop
  endfacet
  facet normal -0.258819 -0.965926 0.000000
    outer loop
      vertex 5.000000 8.660254 -10.000000
      vertex 0.000000 10.000000 10.000000
      vertex 0.000000 10.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 5.000000 8.660254 10.000000
      vertex 0.000000 10.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 0.000000 10.000000 -10.000000
      vertex 5.000000 8.660254 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.258819 -0.965926 0.000000
    outer loop
      vertex 0.000000 10.000000 -10.000000
      vertex 0.000000 10.000000 10.000000
      vertex -5.000000 8.660254 10.000000
    endloop
  endfacet
  facet normal 0.258819 -0.965926 0.000000
    outer loop
      vertex 0.000000 10.000000 -10.000000
      vertex -5.000000 8.660254 10.000000
      vertex -5.000000 8.660254 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 0.000000 10.000000 10.000000
      vertex -5.000000 8.660254 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex -5.000000 8.660254 -10.000000
      vertex 0.000000 10.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.707107 -0.707107 0.000000
    outer loop
      vertex -5.000000 8.660254 -10.000000
      vertex -5.000000 8.660254 10.000000
      vertex -8.660254 5.000000 10.000000
    endloop
  endfacet
  facet normal 0.707107 -0.707107 0.000000
    outer loop
      vertex -5.000000 8.660254 -10.000000
      vertex -8.660254 5.000000 10.000000
      vertex -8.660254 5.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -5.000000 8.660254 10.000000
      vertex -8.660254 5.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex -8.660254 5.000000 -10.000000
      vertex -5.000000 8.660254 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.965926 -0.258819 0.000000
    outer loop
      vertex -8.660254 5.000000 -10.000000
      vertex -8.660254 5.000000 10.000000
      vertex -10.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.965926 -0.258819 0.000000
    outer loop
      vertex -8.660254 5.000000 -10.000000
      vertex -10.000000 0.000000 10.000000
      vertex -10.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -8.660254 5.000000 10.000000
      vertex -10.000000 0.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex -10.000000 0.000000 -10.000000
      vertex -8.660254 5.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.965926 0.258819 0.000000
    outer loop
      vertex -10.000000 0.000000 -10.000000
      vertex -10.000000 0.000000 10.000000
      vertex -8.660254 -5.000000 10.000000
    endloop
  endfacet
  facet normal 0.965926 0.258819 0.000000
    outer loop
      vertex -10.000000 0.000000 -10.000000
      vertex -8.660254 -5.000000 10.000000
      vertex -8.660254 -5.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -10.000000 0.000000 10.000000
      vertex -8.660254 -5.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 -0.000000 -1.000000
    outer loop
      vertex -8.660254 -5.000000 -10.000000
      vertex -10.000000 0.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.707107 0.707107 0.000000
    outer loop
      vertex -8.660254 -5.000000 -10.000000
      vertex -8.660254 -5.000000 10.000000
      vertex -5.000000 -8.660254 10.000000
    endloop
  endfacet
  facet normal 0.707107 0.707107 0.000000
    outer loop
      vertex -8.660254 -5.000000 -10.000000
      vertex -5.000000 -8.660254 10.000000
      vertex -5.000000 -8.660254 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -8.660254 -5.000000 10.000000
      vertex -5.000000 -8.660254 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex -5.000000 -8.660254 -10.000000
      vertex -8.660254 -5.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.258819 0.965926 0.000000
    outer loop
      vertex -5.000000 -8.660254 -10.000000
      vertex -5.000000 -8.660254 10.000000
      vertex -0.000000 -10.000000 10.000000
    endloop
  endfacet
  facet normal 0.258819 0.965926 0.000000
    outer loop
      vertex -5.000000 -8.660254 -10.000000
      vertex -0.000000 -10.000000 10.000000
      vertex -0.000000 -10.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -5.000000 -8.660254 10.000000
      vertex -0.000000 -10.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex -0.000000 -10.000000 -10.000000
      vertex -5.000000 -8.660254 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal -0.258819 0.965926 0.000000
    outer loop
      vertex -0.000000 -10.000000 -10.000000
      vertex -0.000000 -10.000000 10.000000
      vertex 5.000000 -8.660254 10.000000
    endloop
  endfacet
  facet normal -0.258819 0.965926 0.000000
    outer loop
      vertex -0.000000 -10.000000 -10.000000
      vertex 5.000000 -8.660254 10.000000
      vertex 5.000000 -8.660254 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -0.000000 -10.000000 10.000000
      vertex 5.000000 -8.660254 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 5.000000 -8.660254 -10.000000
      vertex -0.000000 -10.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal -0.707107 0.707107 0.000000
    outer loop
      vertex 5.000000 -8.660254 -10.000000
      vertex 5.000000 -8.660254 10.000000
      vertex 8.660254 -5.000000 10.000000
    endloop
  endfacet
  facet normal -0.707107 0.707107 0.000000
    outer loop
      vertex 5.000000 -8.660254 -10.000000
      vertex 8.660254 -5.000000 10.000000
      vertex 8.660254 -5.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 5.000000 -8.660254 10.000000
      vertex 8.660254 -5.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 8.660254 -5.000000 -10.000000
      vertex 5.000000 -8.660254 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal -0.965926 0.258819 0.000000
    outer loop
      vertex 8.660254 -5.000000 -10.000000
      vertex 8.660254 -5.000000 10.000000
      vertex 10.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal -0.965926 0.258819 0.000000
    outer loop
      vertex 8.660254 -5.000000 -10.000000
      vertex 10.000000 0.000000 10.000000
      vertex 10.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 8.660254 -5.000000 10.000000
      vertex 10.000000 0.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 10.000000 0.000000 -10.000000
      vertex 8.660254 -5.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
endsolid cylinder`,
  },
];

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

  app.put(api.materials.update.path, async (req, res) => {
    try {
      const input = api.materials.update.input.parse(req.body);
      const updated = await storage.updateMaterial(Number(req.params.id), input);
      if (!updated) {
        return res.status(404).json({ message: "Material not found" });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.materials.delete.path, async (req, res) => {
    const deleted = await storage.deleteMaterial(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Material not found" });
    }
    res.json({ success: true });
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

  app.put(api.simulations.update.path, async (req, res) => {
    try {
      const simulationId = Number(req.params.id);
      const simulation = await storage.getSimulation(simulationId);
      if (!simulation) {
        return res.status(404).json({ message: "Simulation not found" });
      }
      const input = api.simulations.update.input.parse(req.body);
      const { boundaryConditions, run, ...updateFields } = input;
      const shouldRun = Boolean(run);
      const existingConditions = await storage.getBoundaryConditions(simulationId);
      const existingPayload = existingConditions.map((condition) => ({
        type: condition.type,
        face: condition.face,
        magnitude: condition.magnitude ?? null,
        unit: condition.unit ?? null,
      }));
      const nextPayload = boundaryConditions ?? existingPayload;
      const normalizeBoundaryCondition = (item: {
        type: string;
        face: string;
        magnitude?: number | null;
        unit?: string | null;
      }) => ({
        type: item.type,
        face: item.face,
        magnitude: item.magnitude ?? null,
        unit: item.unit ?? null,
      });
      const normalizeForCompare = (items: typeof nextPayload) =>
        JSON.stringify(
          items
            .map(normalizeBoundaryCondition)
            .sort((a, b) =>
              `${a.face}-${a.type}`.localeCompare(`${b.face}-${b.type}`)
            )
        );
      const normalizedExisting = normalizeForCompare(existingPayload);
      const normalizedNext = normalizeForCompare(nextPayload);
      const hasBoundaryChanges =
        boundaryConditions ? normalizedExisting !== normalizedNext : false;
      const hasNonNameUpdates = Object.entries(updateFields).some(([key, value]) => {
        if (key === "name" || value === undefined) return false;
        const current = (simulation as any)[key];
        return (value ?? null) !== (current ?? null);
      });
      const hasParamChanges = hasNonNameUpdates || hasBoundaryChanges;
      const merged = {
        ...simulation,
        ...updateFields,
        status: shouldRun ? "pending" : simulation.status,
        progress: shouldRun ? 0 : simulation.progress,
        results: shouldRun ? null : simulation.results,
        completedAt: shouldRun ? null : simulation.completedAt,
        paramsDirty: shouldRun
          ? false
          : hasParamChanges
          ? true
          : simulation.paramsDirty ?? false,
      };
      const updated = await storage.updateSimulation(simulationId, {
        name: merged.name,
        materialId: merged.materialId,
        geometryId: merged.geometryId,
        type: merged.type,
        appliedLoad: merged.appliedLoad,
        temperature: merged.temperature,
        duration: merged.duration,
        frequency: merged.frequency,
        dampingRatio: merged.dampingRatio,
        materialModel: merged.materialModel,
        yieldStrength: merged.yieldStrength,
        hardeningModulus: merged.hardeningModulus,
        status: merged.status,
        progress: merged.progress ?? 0,
        results: merged.results ?? null,
        completedAt: merged.completedAt ?? null,
        paramsDirty: merged.paramsDirty ?? false,
      });
      if (!updated) {
        return res.status(404).json({ message: "Simulation not found" });
      }

      if (boundaryConditions) {
        await storage.deleteBoundaryConditions(simulationId);
        if (boundaryConditions.length) {
          await Promise.all(
            boundaryConditions.map((condition) =>
              storage.createBoundaryCondition({
                simulationId,
                type: condition.type,
                face: condition.face,
                magnitude: condition.magnitude ?? null,
                unit: condition.unit ?? null,
              })
            )
          );
        }
      }

      if (shouldRun) {
        const payload = {
          name: updated.name,
          materialId: updated.materialId,
          geometryId: updated.geometryId,
          type: updated.type,
          appliedLoad: updated.appliedLoad,
          temperature: updated.temperature,
          duration: updated.duration,
          frequency: updated.frequency,
          dampingRatio: updated.dampingRatio,
          materialModel: updated.materialModel,
          yieldStrength: updated.yieldStrength,
          hardeningModulus: updated.hardeningModulus,
          boundaryConditions: boundaryConditions ?? (await storage.getBoundaryConditions(simulationId)),
        };
        enqueueSimulation(simulationId, payload);
      }

      res.json(updated);
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

  app.post(api.simulations.cancel.path, async (req, res) => {
    const simulationId = Number(req.params.id);
    const simulation = await storage.getSimulation(simulationId);
    if (!simulation) {
      return res.status(404).json({ message: "Simulation not found" });
    }
    await cancelSimulation(simulationId);
    const updated = await storage.getSimulation(simulationId);
    return res.json(updated ?? simulation);
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
      const { boundaryConditions, ...simulationInput } = input;
      const simulation = await storage.createSimulation(simulationInput);
      
      if (simulation) {
        if (boundaryConditions?.length) {
          await Promise.all(
            boundaryConditions.map((condition) =>
              storage.createBoundaryCondition({
                simulationId: simulation.id,
                type: condition.type,
                face: condition.face,
                magnitude: condition.magnitude ?? null,
                unit: condition.unit ?? null,
              })
            )
          );
        }
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

  // === Geometry Routes ===
  app.get(api.geometries.list.path, async (_req, res) => {
    const allGeometries = await storage.getGeometries();
    res.json(allGeometries);
  });

  app.get(api.geometries.get.path, async (req, res) => {
    const geometry = await storage.getGeometry(Number(req.params.id));
    if (!geometry) {
      return res.status(404).json({ message: "Geometry not found" });
    }
    res.json(geometry);
  });

  app.get(api.geometries.content.path, async (req, res) => {
    const geometry = await storage.getGeometry(Number(req.params.id));
    if (!geometry) {
      return res.status(404).json({ message: "Geometry not found" });
    }
    let buffer: Buffer;
    try {
      buffer = await readStoragePath(geometry.storagePath);
    } catch (err) {
      const seedMatch = seedGeometries.find(
        (item) => item.originalName === geometry.originalName
      );
      if (!seedMatch) {
        return res.status(404).json({
          message:
            "Geometry file missing on server. Re-upload the geometry or attach persistent storage.",
        });
      }
      const fileName = `${Date.now()}-${seedMatch.originalName}`;
      const saved = await saveGeometryFile(
        fileName,
        Buffer.from(seedMatch.content),
      );
      await storage.updateGeometryStorage(
        geometry.id,
        saved.storagePath,
        saved.sizeBytes,
      );
      buffer = Buffer.from(seedMatch.content);
    }
    res.json({
      name: geometry.name,
      format: geometry.format,
      contentBase64: buffer.toString("base64"),
    });
  });

  app.post(api.geometries.create.path, async (req, res) => {
    try {
      const input = api.geometries.create.input.parse(req.body);
      const { name, originalName, format, contentBase64 } = input;
      const normalized = contentBase64.includes(",")
        ? contentBase64.split(",")[1]
        : contentBase64;
      const buffer = Buffer.from(normalized, "base64");
      const safeFormat = format.replace(".", "").toLowerCase();
      const safeName = name.replace(/[^a-z0-9-_]+/gi, "_");
      const fileName = `${Date.now()}-${safeName}.${safeFormat}`;
      const saved = await saveGeometryFile(fileName, buffer);

      const geometry = await storage.createGeometry({
        name,
        originalName,
        format: safeFormat,
        storagePath: saved.storagePath,
        sizeBytes: saved.sizeBytes,
      });

      res.status(201).json(geometry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.put(api.geometries.update.path, async (req, res) => {
    try {
      const input = api.geometries.update.input.parse(req.body);
      const geometryId = Number(req.params.id);
      const geometry = await storage.getGeometry(geometryId);
      if (!geometry) {
        return res.status(404).json({ message: "Geometry not found" });
      }

      let updatePayload: Partial<typeof geometry> = { name: input.name };

      if (input.contentBase64) {
        if (!input.originalName || !input.format) {
          return res.status(400).json({
            message: "originalName and format are required when uploading new geometry content.",
            field: "contentBase64",
          });
        }
        const normalized = input.contentBase64.includes(",")
          ? input.contentBase64.split(",")[1]
          : input.contentBase64;
        const buffer = Buffer.from(normalized, "base64");
        const safeFormat = input.format.replace(".", "").toLowerCase();
        const safeName = input.name.replace(/[^a-z0-9-_]+/gi, "_");
        const fileName = `${Date.now()}-${safeName}.${safeFormat}`;
        const saved = await saveGeometryFile(fileName, buffer);
        updatePayload = {
          name: input.name,
          originalName: input.originalName,
          format: safeFormat,
          storagePath: saved.storagePath,
          sizeBytes: saved.sizeBytes,
        };
      }

      const updated = await storage.updateGeometry(geometryId, updatePayload);
      if (!updated) {
        return res.status(404).json({ message: "Geometry not found" });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.geometries.delete.path, async (req, res) => {
    const deleted = await storage.deleteGeometry(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Geometry not found" });
    }
    res.json({ success: true });
  });

  // === Simulation Mesh Routes ===
  app.get(api.simulationMeshes.listBySimulation.path, async (req, res) => {
    const simulationId = Number(req.params.id);
    const meshes = await storage.getSimulationMeshes(simulationId);
    res.json(meshes);
  });

  app.get(api.simulationMeshes.content.path, async (req, res) => {
    const mesh = await storage.getSimulationMesh(Number(req.params.id));
    if (!mesh) {
      return res.status(404).json({ message: "Simulation mesh not found" });
    }
    const buffer = await readStoragePath(mesh.storagePath);
    res.json({
      name: mesh.name,
      format: mesh.format,
      contentBase64: buffer.toString("base64"),
    });
  });

  // === Simulation Boundary Conditions ===
  app.get(api.simulationBoundaryConditions.listBySimulation.path, async (req, res) => {
    const simulationId = Number(req.params.id);
    const simulation = await storage.getSimulation(simulationId);
    if (!simulation) {
      return res.status(404).json({ message: "Simulation not found" });
    }
    const conditions = await storage.getBoundaryConditions(simulationId);
    res.json(conditions);
  });

  app.post(api.simulationBoundaryConditions.create.path, async (req, res) => {
    try {
      const simulationId = Number(req.params.id);
      const simulation = await storage.getSimulation(simulationId);
      if (!simulation) {
        return res.status(404).json({ message: "Simulation not found" });
      }
      const input = api.simulationBoundaryConditions.create.input.parse(req.body);
      const condition = await storage.createBoundaryCondition({
        simulationId,
        type: input.type,
        face: input.face,
        magnitude: input.magnitude ?? null,
        unit: input.unit ?? null,
      });
      res.status(201).json(condition);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
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
  await ensureLocalStorageRoot();
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

  const existingGeometries = await storage.getGeometries();
  if (existingGeometries.length === 0) {
    for (const sample of seedGeometries) {
      const safeName = sample.originalName.replace(/[^a-z0-9-_.]+/gi, "_");
      const fileName = `${Date.now()}-${safeName}`;
      const saved = await saveGeometryFile(
        fileName,
        Buffer.from(sample.content),
      );
      await storage.createGeometry({
        name: sample.name,
        originalName: sample.originalName,
        format: sample.format,
        storagePath: saved.storagePath,
        sizeBytes: saved.sizeBytes,
      });
    }
    return;
  }

  for (const geometry of existingGeometries) {
    try {
      await readStoragePath(geometry.storagePath);
    } catch {
      const seedMatch = seedGeometries.find(
        (item) => item.originalName === geometry.originalName
      );
      if (!seedMatch) continue;
      const fileName = `${Date.now()}-${seedMatch.originalName}`;
      const saved = await saveGeometryFile(
        fileName,
        Buffer.from(seedMatch.content),
      );
      await storage.updateGeometryStorage(
        geometry.id,
        saved.storagePath,
        saved.sizeBytes,
      );
    }
  }
}
