import fs from 'fs';
import path from 'path';
import { pool, testConnection } from '../config/database.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding Neon database with Hindi book data...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Neon database. Please check your DATABASE_URL.');
    }

    // Check if data already exists
    const bookCount = await pool.query('SELECT COUNT(*) FROM books');
    if (parseInt(bookCount.rows[0].count) > 0) {
      console.log('📚 Data already exists, skipping seed...');
      console.log(`Current data: ${bookCount.rows[0].count} books`);
      return;
    }

    // Read and execute seed data
    const seedPath = path.join(process.cwd(), 'database', 'seeds.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at ${seedPath}`);
    }
    
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    console.log('📚 Inserting Hindi books and authors into Neon...');
    
    // Split and execute SQL statements one by one for better error handling
    const statements = seedSQL.split(';').filter(stmt => stmt.trim());
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await pool.query(statement);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.error(`Error in statement ${i + 1}:`, error.message);
          }
        }
      }
    }
    
    console.log('✅ Seed data inserted successfully');

    // Verify data insertion
    const [newBookCount, authorCount, customerCount, orderCount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM books'),
      pool.query('SELECT COUNT(*) FROM authors'),
      pool.query('SELECT COUNT(*) FROM customers'),
      pool.query('SELECT COUNT(*) FROM orders')
    ]);

    console.log(`📊 Data Summary:`);
    console.log(`   Books: ${newBookCount.rows[0].count}`);
    console.log(`   Authors: ${authorCount.rows[0].count}`);
    console.log(`   Customers: ${customerCount.rows[0].count}`);
    console.log(`   Orders: ${orderCount.rows[0].count}`);

    console.log('🎯 Neon database seeding completed!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    if (error.message.includes('password authentication')) {
      console.log('💡 Tip: Make sure your DATABASE_URL is correct and properly encoded');
    }
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export { seedDatabase };