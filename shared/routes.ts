import { z } from 'zod';
import {
  insertMaterialSchema,
  materials,
  simulations,
  insertSimulationSchema,
  geometries,
  insertGeometrySchema,
  simulationMeshes,
  simulationBoundaryConditions,
} from './schema';

const boundaryConditionSchema = z.object({
  type: z.enum(["fixed", "pressure"]),
  face: z.enum(["x+", "x-", "y+", "y-", "z+", "z-"]),
  magnitude: z.number().nullable().optional(),
  unit: z.string().optional(),
});

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

const userResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
});

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: z.object({
        email: z.string().email(),
        password: z.string().min(8),
      }),
      responses: {
        201: userResponseSchema,
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        email: z.string().email(),
        password: z.string().min(8),
      }),
      responses: {
        200: userResponseSchema,
        400: errorSchemas.validation,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ success: z.literal(true) }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: userResponseSchema,
        401: errorSchemas.unauthorized,
      },
    },
    verify: {
      method: 'GET' as const,
      path: '/api/auth/verify',
      responses: {
        200: z.object({ success: z.literal(true) }),
        400: errorSchemas.validation,
      },
    },
    updateProfile: {
      method: "PUT" as const,
      path: "/api/auth/profile",
      input: z.object({
        name: z.string().min(1).max(120).optional(),
        email: z.string().email().optional(),
      }),
      responses: {
        200: userResponseSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    changePassword: {
      method: "POST" as const,
      path: "/api/auth/password",
      input: z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      }),
      responses: {
        200: z.object({ success: z.literal(true) }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  materials: {
    list: {
      method: 'GET' as const,
      path: '/api/materials',
      responses: {
        200: z.array(z.custom<typeof materials.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/materials',
      input: insertMaterialSchema,
      responses: {
        201: z.custom<typeof materials.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/materials/:id',
      responses: {
        200: z.custom<typeof materials.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/materials/:id',
      input: insertMaterialSchema,
      responses: {
        200: z.custom<typeof materials.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/materials/:id',
      responses: {
        200: z.object({ success: z.literal(true) }),
        404: errorSchemas.notFound,
      },
    },
  },
  simulations: {
    list: {
      method: 'GET' as const,
      path: '/api/simulations',
      responses: {
        200: z.array(z.custom<typeof simulations.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/simulations',
      input: insertSimulationSchema.pick({
        name: true,
        materialId: true,
        geometryId: true,
        type: true,
        appliedLoad: true,
        temperature: true,
        duration: true,
        frequency: true,
        dampingRatio: true,
        materialModel: true,
        yieldStrength: true,
        hardeningModulus: true,
      }).extend({
        boundaryConditions: z.array(boundaryConditionSchema).optional(),
      }),
      responses: {
        201: z.custom<typeof simulations.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/simulations/:id',
      responses: {
        200: z.custom<typeof simulations.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/simulations/:id',
      input: insertSimulationSchema
        .pick({
          name: true,
          materialId: true,
          geometryId: true,
          type: true,
          appliedLoad: true,
          temperature: true,
          duration: true,
          frequency: true,
          dampingRatio: true,
          materialModel: true,
          yieldStrength: true,
          hardeningModulus: true,
        })
        .partial()
        .extend({
          boundaryConditions: z.array(boundaryConditionSchema).optional(),
          run: z.boolean().optional(),
        }),
      responses: {
        200: z.custom<typeof simulations.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    cancel: {
      method: 'POST' as const,
      path: '/api/simulations/:id/cancel',
      responses: {
        200: z.custom<typeof simulations.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/simulations/:id',
      responses: {
        200: z.object({ success: z.literal(true) }),
        404: errorSchemas.notFound,
      },
    },
  },
  geometries: {
    list: {
      method: 'GET' as const,
      path: '/api/geometries',
      responses: {
        200: z.array(z.custom<typeof geometries.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/geometries',
      input: z.object({
        name: z.string().min(1),
        originalName: z.string().min(1),
        format: z.string().min(1),
        contentBase64: z.string().min(1),
      }),
      responses: {
        201: z.custom<typeof geometries.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/geometries/:id',
      responses: {
        200: z.custom<typeof geometries.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    content: {
      method: 'GET' as const,
      path: '/api/geometries/:id/content',
      responses: {
        200: z.object({
          name: z.string(),
          format: z.string(),
          contentBase64: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/geometries/:id',
      input: z.object({
        name: z.string().min(1),
        originalName: z.string().optional(),
        format: z.string().optional(),
        contentBase64: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof geometries.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/geometries/:id',
      responses: {
        200: z.object({ success: z.literal(true) }),
        404: errorSchemas.notFound,
      },
    },
  },
  simulationMeshes: {
    listBySimulation: {
      method: 'GET' as const,
      path: '/api/simulations/:id/meshes',
      responses: {
        200: z.array(z.custom<typeof simulationMeshes.$inferSelect>()),
      },
    },
    content: {
      method: 'GET' as const,
      path: '/api/simulation-meshes/:id/content',
      responses: {
        200: z.object({
          name: z.string(),
          format: z.string(),
          contentBase64: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
  },
  simulationBoundaryConditions: {
    listBySimulation: {
      method: 'GET' as const,
      path: '/api/simulations/:id/boundary-conditions',
      responses: {
        200: z.array(z.custom<typeof simulationBoundaryConditions.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/simulations/:id/boundary-conditions',
      input: boundaryConditionSchema,
      responses: {
        201: z.custom<typeof simulationBoundaryConditions.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
