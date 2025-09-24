import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

// Parse DATABASE_URL or use individual config
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
    };
  }
  
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rajkamal_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
};

// Database configuration
const dbConfig = {
  ...getDatabaseConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    client.release();
    console.log('✅ Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Enhanced query helper with better error handling
export const query = async (text: string, params?: any[]) => {
  try {
    const start = Date.now();
    const client = await pool.connect();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    client.release();
    
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.log('🐌 Slow query detected:', { duration, text: text.substring(0, 100) + '...' });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', {
      error: error.message,
      query: text.substring(0, 100) + '...',
      params: params?.slice(0, 3), // Only show first 3 params for security
    });
    throw error;
  }
};

// Gracefully close the pool
export const closePool = async () => {
  await pool.end();
  console.log('Database pool closed');
};

// Handle process termination
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});