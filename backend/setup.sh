#!/bin/bash

# Raj-Kamal Backend Setup Script

echo "🚀 Setting up Raj-Kamal Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your database credentials and JWT secret"
fi

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npm run db:generate

echo "✅ Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database credentials"
echo "2. Set up PostgreSQL database"
echo "3. Run 'npm run db:push' to create database schema"
echo "4. Run 'npm run dev' to start development server"
echo ""
echo "📚 For more information, see README.md"
