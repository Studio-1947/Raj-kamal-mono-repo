@echo off

REM Raj-Kamal Backend Setup Script for Windows

echo 🚀 Setting up Raj-Kamal Backend...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Check if .env exists, if not copy from example
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ⚠️  Please edit .env file with your database credentials and JWT secret
)

REM Generate Prisma client
echo 🗄️  Generating Prisma client...
npm run db:generate

echo ✅ Backend setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your database credentials
echo 2. Set up PostgreSQL database
echo 3. Run 'npm run db:push' to create database schema
echo 4. Run 'npm run dev' to start development server
echo.
echo 📚 For more information, see README.md
pause
