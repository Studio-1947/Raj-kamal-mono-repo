# Raj Kamal Publishing - Database Setup Guide

## 🚀 Quick Setup

### Prerequisites
- PostgreSQL 12+ installed and running
- Node.js 18+ installed
- Git

### 1. Database Setup

**Install PostgreSQL** (if not already installed):
```bash
# On Ubuntu/Debian
sudo apt update && sudo apt install postgresql postgresql-contrib

# On macOS with Homebrew
brew install postgresql
brew services start postgresql

# On Windows - Download from https://www.postgresql.org/download/windows/
```

**Create Database:**
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE rajkamal_db;
CREATE USER rajkamal_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rajkamal_db TO rajkamal_user;
\q
```

### 2. Backend Configuration

**Setup Environment:**
```bash
cd backend
cp src/.env.example .env
```

**Update .env file:**
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rajkamal_db
DB_USER=rajkamal_user
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here-make-it-long-and-random
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Admin Configuration
ADMIN_EMAIL=admin@rajkamal.com
ADMIN_PASSWORD=admin123
```

**Install Dependencies:**
```bash
npm install
```

**Build the Project:**
```bash
npm run build
```

**Setup Database Schema and Seed Data:**
```bash
# Create tables
npm run db:setup

# Insert Hindi book data
npm run db:seed

# Or do both at once
npm run db:reset
```

**Start the Server:**
```bash
npm run dev
```

### 3. Verify Setup

**Check Database Connection:**
Visit `http://localhost:3000/health` - should show database connected

**Test API Endpoints:**
```bash
# Get dashboard data
curl http://localhost:3000/api/dashboard/overview

# Get book inventory
curl http://localhost:3000/api/inventory/items

# Get rankings
curl http://localhost:3000/api/rankings/products
```

### 4. Frontend Integration

The frontend is already configured to work with these endpoints. Just ensure the backend is running on port 3000.

## 📊 What's Included

### Database Schema
- **Authors**: Hindi literature authors (प्रेमचंद, रेणु, etc.)
- **Categories**: Book categories (उपन्यास, कहानी, काव्य, etc.)
- **Books**: 15+ Hindi books with proper stock levels
- **Customers**: 8 sample customers with Hindi names
- **Orders**: 1500+ orders with realistic sales data
- **Social Media**: Platform metrics for Facebook, Instagram, YouTube, Twitter
- **Territories**: State-wise sales performance

### API Endpoints
- `GET /api/dashboard/overview` - Complete dashboard data
- `GET /api/inventory/items` - Book inventory with filtering
- `GET /api/rankings/products` - Product performance rankings
- `GET /api/rankings/customers` - Customer rankings
- `GET /api/social/summary` - Social media metrics

### Sample Data Highlights
- **गोदान** by मुंशी प्रेमचंद (450 copies in stock)
- **हरी घास के ये दिन** by फणीश्वरनाथ रेणु (23 copies - low stock)
- **चित्रलेखा** by भगवतीचरण वर्मा (89 copies in stock)
- Total sales: ₹32,00,000+ with 2.05% growth
- 1,847 orders from 1,284 customers

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U rajkamal_user -d rajkamal_db
```

### Permission Issues
```bash
# Grant necessary permissions
sudo -u postgres psql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rajkamal_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rajkamal_user;
```

### Port Conflicts
If port 3000 is busy, update the `PORT` in your `.env` file and restart.

## 📈 Data Insights

The seeded data provides realistic insights:
- Top book: **गोदान** with ₹2,84,700 revenue
- Top customer: **राजेश कुमार शर्मा** with ₹47,500 spent
- Top category: **उपन्यास** with 48.5% market share
- Social growth: +835 Facebook followers, +450 Instagram followers

Your frontend dashboard will now display real data instead of hardcoded values!