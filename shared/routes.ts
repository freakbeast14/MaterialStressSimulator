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
  defaultMaterials,
  defaultGeometries,
  insertDefaultMaterialSchema,
  insertDefaultGeometrySchema,
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
  roleId: z.number(),
});

// ============================================
// API CONTRACT
// ============================================
export const api = {
  admin: {
    users: {
      create: {
        method: "POST" as const,
        path: "/api/admin/users",
        input: z.object({
          name: z.string().min(1).max(120),
          email: z.string().email(),
          password: z.string().min(8),
          roleId: z.number().optional(),
          emailVerified: z.boolean().optional(),
        }),
        responses: {
          201: userResponseSchema,
          400: errorSchemas.validation,
        },
      },
      list: {
        method: "GET" as const,
        path: "/api/admin/users",
        responses: {
          200: z.array(
            userResponseSchema.extend({
              createdAt: z.string().or(z.date()).optional(),
              deletedAt: z.string().or(z.date()).nullable().optional(),
            })
          ),
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/admin/users/:id",
        input: z.object({
          name: z.string().min(1).max(120).optional(),
          email: z.string().email().optional(),
          roleId: z.number().optional(),
          emailVerified: z.boolean().optional(),
        }),
        responses: {
          200: userResponseSchema,
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      resetPassword: {
        method: "POST" as const,
        path: "/api/admin/users/:id/password",
        input: z.object({
          newPassword: z.string().min(8),
        }),
        responses: {
          200: z.object({ success: z.literal(true) }),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/admin/users/:id",
        responses: {
          200: z.object({ success: z.literal(true) }),
          404: errorSchemas.notFound,
        },
      },
      materials: {
        list: {
          method: "GET" as const,
          path: "/api/admin/users/:id/materials",
          responses: {
            200: z.array(z.custom<typeof materials.$inferSelect>()),
            404: errorSchemas.notFound,
          },
        },
        create: {
          method: "POST" as const,
          path: "/api/admin/users/:id/materials",
          input: insertMaterialSchema,
          responses: {
            201: z.custom<typeof materials.$inferSelect>(),
            400: errorSchemas.validation,
            404: errorSchemas.notFound,
          },
        },
        update: {
          method: "PUT" as const,
          path: "/api/admin/users/:id/materials/:materialId",
          input: insertMaterialSchema,
          responses: {
            200: z.custom<typeof materials.$inferSelect>(),
            400: errorSchemas.validation,
            404: errorSchemas.notFound,
          },
        },
        delete: {
          method: "DELETE" as const,
          path: "/api/admin/users/:id/materials/:materialId",
          responses: {
            200: z.object({ success: z.literal(true) }),
            404: errorSchemas.notFound,
          },
        },
      },
      geometries: {
        list: {
          method: "GET" as const,
          path: "/api/admin/users/:id/geometries",
          responses: {
            200: z.array(z.custom<typeof geometries.$inferSelect>()),
            404: errorSchemas.notFound,
          },
        },
        create: {
          method: "POST" as const,
          path: "/api/admin/users/:id/geometries",
          input: z.object({
            name: z.string().min(1),
            originalName: z.string().min(1),
            format: z.string().min(1),
            contentBase64: z.string().min(1),
          }),
          responses: {
            201: z.custom<typeof geometries.$inferSelect>(),
            400: errorSchemas.validation,
            404: errorSchemas.notFound,
          },
        },
        update: {
          method: "PUT" as const,
          path: "/api/admin/users/:id/geometries/:geometryId",
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
          method: "DELETE" as const,
          path: "/api/admin/users/:id/geometries/:geometryId",
          responses: {
            200: z.object({ success: z.literal(true) }),
            404: errorSchemas.notFound,
          },
        },
      },
    },
    defaultMaterials: {
      list: {
        method: "GET" as const,
        path: "/api/admin/default-materials",
        responses: {
          200: z.array(z.custom<typeof defaultMaterials.$inferSelect>()),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/admin/default-materials",
        input: insertDefaultMaterialSchema,
        responses: {
          201: z.custom<typeof defaultMaterials.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/admin/default-materials/:id",
        input: insertDefaultMaterialSchema,
        responses: {
          200: z.custom<typeof defaultMaterials.$inferSelect>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/admin/default-materials/:id",
        responses: {
          200: z.object({ success: z.literal(true) }),
          404: errorSchemas.notFound,
        },
      },
    },
    defaultGeometries: {
      list: {
        method: "GET" as const,
        path: "/api/admin/default-geometries",
        responses: {
          200: z.array(z.custom<typeof defaultGeometries.$inferSelect>()),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/admin/default-geometries",
        input: z.object({
          name: z.string().min(1),
          originalName: z.string().min(1),
          format: z.string().min(1),
          contentBase64: z.string().min(1),
        }),
        responses: {
          201: z.custom<typeof defaultGeometries.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/admin/default-geometries/:id",
        input: z.object({
          name: z.string().min(1),
          originalName: z.string().optional(),
          format: z.string().optional(),
          contentBase64: z.string().optional(),
        }),
        responses: {
          200: z.custom<typeof defaultGeometries.$inferSelect>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/admin/default-geometries/:id",
        responses: {
          200: z.object({ success: z.literal(true) }),
          404: errorSchemas.notFound,
        },
      },
      content: {
        method: "GET" as const,
        path: "/api/admin/default-geometries/:id/content",
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
  },
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: z.object({
        name: z.string().min(1).max(120),
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
        newPassword: z
          .string()
          .min(8)
          .regex(
            /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/,
            "Password must include at least a number and a special character.",
          ),
      }),
      responses: {
        200: z.object({ success: z.literal(true) }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    forgotPassword: {
      method: "POST" as const,
      path: "/api/auth/forgot-password",
      input: z.object({
        email: z.string().email(),
      }),
      responses: {
        200: z.object({ success: z.literal(true) }),
        400: errorSchemas.validation,
      },
    },
    resetPassword: {
      method: "POST" as const,
      path: "/api/auth/reset-password",
      input: z.object({
        token: z.string().min(1),
        password: z
          .string()
          .min(8)
          .regex(
            /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/,
            "Password must include at least a number and a special character.",
          ),
      }),
      responses: {
        200: z.object({ success: z.literal(true) }),
        400: errorSchemas.validation,
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
