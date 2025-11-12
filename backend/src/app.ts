import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import inventoryRoutes from './routes/inventory.js';
import rankingsRoutes from './routes/rankings.js';
import metricsRoutes from './routes/metrics.js';
import { errorHandler } from './middleware/errorHandler.js';
import { mountOnlineSales } from './features/sales/server/online.index.js';
import { mountOfflineSales } from './features/sales/server/offline.index.js';
import { mountLokEventSales } from './features/sales/server/lok-event.index.js';
import { mountRajRadhaEventSales } from './features/sales/server/rajradha-event.index.js';
import { notFound } from './middleware/notFound.js';

// Load environment variables
dotenv.config();

const app = express();

const sanitizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '');

const corsOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => sanitizeOrigin(origin))
  .filter(Boolean);

if (corsOrigins.length === 0) {
  corsOrigins.push('http://localhost:5173');
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = sanitizeOrigin(origin);
    if (corsOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Blocked CORS origin: ${origin}`);
    }

    // Do not error — disable CORS for this request
    // Returning false lets the request proceed without CORS headers
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root endpoint - Backend status page
app.get('/', (_req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Raj-Kamal Backend Status</title>
        <style>
          :root { color-scheme: light; }
          body {
            margin: 2.5rem auto;
            max-width: 720px;
            font-family: "Segoe UI", system-ui, sans-serif;
            line-height: 1.6;
            color: #111;
          }
          h1 { margin: 0 0 0.5rem; font-size: 2rem; }
          p { margin: 0.25rem 0; }
          ul { margin: 1rem 0 0; padding-left: 1.25rem; }
          code { background: #f4f4f4; padding: 0.1rem 0.3rem; border-radius: 4px; }
          .meta { color: #555; font-size: 0.95rem; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <h1>Raj-Kamal Backend API is running</h1>
        <p>Status: <strong>OK</strong></p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <ul>
          <li><code>/health</code></li>
          <li><code>/api/auth</code></li>
          <li><code>/api/dashboard</code></li>
          <li><code>/api/inventory</code></li>
          <li><code>/api/rankings</code></li>
        </ul>
        <p class="meta">Use these endpoints in your frontend or via API clients.</p>
      </body>
    </html>
  `);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/metrics', metricsRoutes);
// Sales APIs (features)
mountOnlineSales(app, '/api/online-sales');
mountOfflineSales(app, '/api/offline-sales');
mountLokEventSales(app, '/api/lok-event-sales');
mountRajRadhaEventSales(app, '/api/rajradha-event-sales');

// Fallback route for any unmatched requests
app.use('*', (req, res) => {
  console.log('Fallback route hit:', req.method, req.originalUrl);
  res.status(200).json({
    message: 'Raj-Kamal Backend API is running!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    requestedPath: req.originalUrl,
    method: req.method,
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      dashboard: '/api/dashboard',
      inventory: '/api/inventory',
      rankings: '/api/rankings'
    },
    documentation: 'Visit /api/auth/admin-status to check admin setup'
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

export default app;
