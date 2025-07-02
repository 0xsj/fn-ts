// src/docs/swagger.routes.ts
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenAPIDocument } from './zod-openapi.config';
import { dark } from './theme';

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

  // Serve Swagger UI with dark theme
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: dark,
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

function getSwaggerDarkTheme(): string {
  return `
    /* Dark theme for Swagger UI */
    .swagger-ui {
      filter: invert(88%) hue-rotate(180deg);
    }
    
    .swagger-ui .highlight-code {
      filter: invert(100%) hue-rotate(180deg);
    }
    
    .swagger-ui img {
      filter: invert(100%) hue-rotate(180deg);
    }
    
    .swagger-ui .microlight {
      filter: invert(100%) hue-rotate(180deg);
    }
  `;
}