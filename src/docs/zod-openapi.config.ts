// src/docs/zod-openapi.config.ts
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

// Create registry
export const registry = new OpenAPIRegistry();

// Import your schemas
import {
  UserSchema,
  UserPublicSchema,
  CreateUserSchema,
  UpdateUserSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  SessionSchema,
  OrganizationSchema,
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
} from '../domain/entities';

// ============================================
// REGISTER COMMON RESPONSE SCHEMAS
// ============================================
const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z.object({
      correlationId: z.string().uuid().optional(),
      timestamp: z.string().datetime(),
    }).optional(),
  });

const ErrorResponseSchema = z.object({
  success: z.literal(false),
  kind: z.string(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  meta: z.object({
    correlationId: z.string().uuid().optional(),
    timestamp: z.string().datetime(),
  }).optional(),
});

const ValidationErrorSchema = z.object({
  success: z.literal(false),
  kind: z.literal('validation-error'),
  error: z.object({
    code: z.literal('VALIDATION_ERROR'),
    message: z.literal('Validation failed'),
    details: z.record(z.array(z.string())),
  }),
  meta: z.object({
    correlationId: z.string().uuid().optional(),
    timestamp: z.string().datetime(),
  }).optional(),
});

// Register common schemas
registry.register('ErrorResponse', ErrorResponseSchema);
registry.register('ValidationError', ValidationErrorSchema);

// ============================================
// REGISTER ENTITY SCHEMAS
// ============================================
registry.register('User', UserPublicSchema);
registry.register('CreateUser', CreateUserSchema);
registry.register('UpdateUser', UpdateUserSchema);
registry.register('LoginRequest', LoginRequestSchema);
registry.register('LoginResponse', LoginResponseSchema);
registry.register('Session', SessionSchema);
registry.register('Organization', OrganizationSchema);
registry.register('CreateOrganization', CreateOrganizationSchema);
registry.register('UpdateOrganization', UpdateOrganizationSchema);

// ============================================
// SECURITY SCHEMES
// ============================================
const bearerAuth = registry.registerComponent(
  'securitySchemes',
  'bearerAuth',
  {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT Authorization header using the Bearer scheme',
  }
);

// ============================================
// USER ENDPOINTS
// ============================================

// POST /users
registry.registerPath({
  method: 'post',
  path: '/users',
  description: 'Create a new user account',
  summary: 'Create user',
  tags: ['Users'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'User created successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(UserPublicSchema),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ValidationErrorSchema,
        },
      },
    },
    409: {
      description: 'Conflict - Email or username already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    429: {
      description: 'Rate limit exceeded',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /users
registry.registerPath({
  method: 'get',
  path: '/users',
  description: 'Get all users',
  summary: 'List users',
  tags: ['Users'],
  responses: {
    200: {
      description: 'List of users',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.array(UserPublicSchema)),
        },
      },
    },
  },
});

// GET /users/:id
registry.registerPath({
  method: 'get',
  path: '/users/{id}',
  description: 'Get a user by ID',
  summary: 'Get user',
  tags: ['Users'],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: 'User ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
  },
  responses: {
    200: {
      description: 'User found',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(UserPublicSchema.nullable()),
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// PUT /users/:id
registry.registerPath({
  method: 'put',
  path: '/users/{id}',
  description: 'Update a user',
  summary: 'Update user',
  tags: ['Users'],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateUserSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'User updated successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(UserPublicSchema),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ValidationErrorSchema,
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// DELETE /users/:id
registry.registerPath({
  method: 'delete',
  path: '/users/{id}',
  description: 'Delete a user (soft delete by default, hard delete with ?hard=true)',
  summary: 'Delete user',
  tags: ['Users'],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    query: z.object({
      hard: z.string().optional().openapi({
        description: 'Set to "true" for hard delete',
      }),
    }),
  },
  responses: {
    200: {
      description: 'User deleted successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.boolean()),
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /users/username/:username
registry.registerPath({
  method: 'get',
  path: '/users/username/{username}',
  description: 'Get a user by username',
  summary: 'Get user by username',
  tags: ['Users'],
  request: {
    params: z.object({
      username: z.string().openapi({
        description: 'Username',
        example: 'johndoe',
      }),
    }),
  },
  responses: {
    200: {
      description: 'User found',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(UserPublicSchema.nullable()),
        },
      },
    },
  },
});

// GET /users/organization/:organizationId
registry.registerPath({
  method: 'get',
  path: '/users/organization/{organizationId}',
  description: 'Get all users in an organization',
  summary: 'Get users by organization',
  tags: ['Users'],
  request: {
    params: z.object({
      organizationId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'List of users in the organization',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.array(UserPublicSchema)),
        },
      },
    },
  },
});

// ============================================
// AUTH ENDPOINTS
// ============================================

// POST /auth/login
registry.registerPath({
  method: 'post',
  path: '/auth/login',
  description: 'Authenticate user and get access token',
  summary: 'Login',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      headers: z.object({
        'Set-Cookie': z.string().openapi({
          description: 'HttpOnly cookie containing refresh token',
        }),
      }),
      content: {
        'application/json': {
          schema: SuccessResponseSchema(
            z.object({
              user: UserPublicSchema,
              tokens: z.object({
                accessToken: z.string(),
                tokenType: z.literal('Bearer'),
                expiresIn: z.number(),
              }),
              session: SessionSchema,
            })
          ),
        },
      },
    },
    400: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: ValidationErrorSchema,
        },
      },
    },
    429: {
      description: 'Too many login attempts',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /auth/logout
registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  description: 'Logout user and invalidate session',
  summary: 'Logout',
  tags: ['Authentication'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            logoutAll: z.boolean().optional().openapi({
              description: 'Logout from all devices',
              default: false,
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Logout successful',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(
            z.object({
              message: z.string(),
            })
          ),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /auth/sessions/:sessionId
registry.registerPath({
  method: 'get',
  path: '/auth/sessions/{sessionId}',
  description: 'Get session details',
  summary: 'Get session',
  tags: ['Authentication'],
  request: {
    params: z.object({
      sessionId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Session details',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(SessionSchema),
        },
      },
    },
    400: {
      description: 'Invalid session ID format',
      content: {
        'application/json': {
          schema: ValidationErrorSchema,
        },
      },
    },
    404: {
      description: 'Session not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================
// ORGANIZATION ENDPOINTS
// ============================================

// POST /organizations
registry.registerPath({
  method: 'post',
  path: '/organizations',
  description: 'Create a new organization',
  summary: 'Create organization',
  tags: ['Organizations'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateOrganizationSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Organization created successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(OrganizationSchema),
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ValidationErrorSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Organization slug already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /organizations/:id
registry.registerPath({
  method: 'get',
  path: '/organizations/{id}',
  description: 'Get organization by ID',
  summary: 'Get organization',
  tags: ['Organizations'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Organization details',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(OrganizationSchema),
        },
      },
    },
    404: {
      description: 'Organization not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /organizations/by-slug/:slug
registry.registerPath({
  method: 'get',
  path: '/organizations/by-slug/{slug}',
  description: 'Get organization by slug',
  summary: 'Get organization by slug',
  tags: ['Organizations'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      slug: z.string().openapi({
        description: 'Organization slug',
        example: 'acme-corp',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Organization details',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(OrganizationSchema),
        },
      },
    },
    404: {
      description: 'Organization not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================
// HEALTH ENDPOINTS
// ============================================

registry.registerPath({
  method: 'get',
  path: '/health',
  description: 'Check system health',
  summary: 'Health check',
  tags: ['Health'],
  responses: {
    200: {
      description: 'System is healthy',
      content: {
        'application/json': {
          schema: z.object({
            status: z.enum(['healthy', 'degraded', 'unhealthy']),
            timestamp: z.string().datetime(),
            uptime: z.number(),
            checks: z.record(
              z.object({
                status: z.enum(['healthy', 'degraded', 'unhealthy']),
                responseTime: z.number(),
                details: z.any().optional(),
              })
            ),
          }),
        },
      },
    },
  },
});

// ============================================
// GENERATE OPENAPI DOCUMENT
// ============================================
export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'FireNotifications API',
      description: 'Comprehensive incident notification and management system',
      contact: {
        name: 'API Support',
        email: 'support@firenotifications.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.firenotifications.com/v1',
        description: 'Production server',
      },
    ],
  });
}