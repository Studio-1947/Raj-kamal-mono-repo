#!/usr/bin/env node

import { testConnection, pool } from '../config/database.js';

const main = async () => {
  console.log('🔍 Testing Neon database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');
  
  try {
    // Test basic connection
    const connected = await testConnection();
    if (!connected) {
      console.log('❌ Connection failed - check your DATABASE_URL');
      process.exit(1);
    }

    // Test a simple query
    const result = await pool.query('SELECT version()');
    console.log('📊 PostgreSQL Version:', result.rows[0].version.split(' ')[0]);

    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('📋 Existing tables:', tablesResult.rows.map(row => row.table_name).join(', '));
    } else {
      console.log('📋 No tables found - run npm run db:setup to create them');
    }

    console.log('✅ Database connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
};

main();