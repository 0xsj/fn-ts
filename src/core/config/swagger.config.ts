import swaggerJSDoc from 'swagger-jsdoc';
import { config } from '.';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'FireNotifications API',
    version: '1.0.0',
    description: 'API documentation for the FireNotifications system',
    contact: {
      name: 'API Support',
      email: 'support@firenotifications.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.app.port}/api/v1`,
      description: 'Development server',
    },
    {
      url: 'https://api.firenotifications.com/v1',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
      },
    },
    schemas: {}, // We'll add schemas here
  },
  security: [],
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/api/v1/routes/*.ts',
    './src/api/v1/controller/*.ts',
    './src/domain/entities/schemas/*.ts',
    './src/swagger/*.ts', // For additional swagger docs
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
