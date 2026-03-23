import swaggerJsDoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine the project root (assuming this file is in src/config/)
const rootDir = path.resolve(__dirname, '../../');

const options: swaggerJsDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Raj-Kamal Backend API',
      version: '1.0.0',
      description: 'API documentation for the Raj-Kamal web application',
      contact: {
        name: 'Raj-Kamal Team',
      },
    },
    servers: [
      {
        url: process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : process.env.NODE_ENV === 'production'
          ? 'https://rk-backend.vercel.app' 
          : `http://localhost:${process.env.PORT || 4000}`,
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs - using absolute paths for Vercel compatibility
  apis: [
    path.join(rootDir, 'src/app.ts'),
    path.join(rootDir, 'src/routes/*.ts'),
    path.join(rootDir, 'src/features/*/server/*.routes.ts'),
    path.join(rootDir, 'dist/app.js'),
    path.join(rootDir, 'dist/routes/*.js'),
    path.join(rootDir, 'dist/features/*/server/*.routes.js'),
  ],
};

export const swaggerSpec = swaggerJsDoc(options);

