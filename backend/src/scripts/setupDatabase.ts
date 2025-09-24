import fs from 'fs';
import path from 'path';
import { pool, testConnection } from '../config/database.js';

const setupDatabase = async () => {
  try {
    console.log('🔄 Setting up database with Neon...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Neon database. Please check your DATABASE_URL.');
    }

    // Check if tables already exist
    const tablesExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'books'
      );
    `);

    if (tablesExist.rows[0].exists) {
      console.log('📋 Tables already exist, skipping schema creation...');
      return;
    }

    // Read and execute schema
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Creating tables in Neon database...');
    await pool.query(schemaSQL);
    console.log('✅ Tables created successfully');

    console.log('🎯 Database setup completed!');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    if (error.message.includes('password authentication')) {
      console.log('💡 Tip: Make sure your DATABASE_URL is correct and the password is properly encoded');
    }
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}

export { setupDatabase };