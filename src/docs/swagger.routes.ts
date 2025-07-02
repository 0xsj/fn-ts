// src/docs/swagger.routes.ts
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenAPIDocument } from './zod-openapi.config';

export function createSwaggerRoutes(): Router {
  const router = Router();
  
  // Generate the OpenAPI spec
  const swaggerSpec = generateOpenAPIDocument();

  // Redirect /api to /api/docs
  router.get('/', (_req, res) => {
    res.redirect('/api/docs');
  });

  // Serve Swagger JSON for all versions
  router.get('/swagger.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // You could also serve version-specific docs
  router.get('/v1/swagger.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec); // In future, filter for v1 only
  });

  // Serve Swagger UI
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'FireNotifications API Docs',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      filter: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
    },
  }));

  return router;
}