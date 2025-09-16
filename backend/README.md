# Raj-Kamal Backend API

A modern, scalable backend API built with Node.js, Express, TypeScript, and Prisma.

## Features

- 🔐 JWT Authentication
- 📊 Dashboard Analytics
- 📦 Inventory Management
- 🏆 Rankings System
- 🗄️ PostgreSQL Database with Prisma ORM
- 🛡️ Security Middleware (Helmet, CORS, Rate Limiting)
- 📝 Request Validation with Zod
- 🔍 Comprehensive Error Handling

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- npm or yarn

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:4000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user

### Dashboard
- `GET /api/dashboard/overview` - Get dashboard overview
- `GET /api/dashboard/sales` - Get sales statistics
- `GET /api/dashboard/orders` - Get orders statistics
- `GET /api/dashboard/customers` - Get customer statistics

### Inventory
- `GET /api/inventory/items` - Get all inventory items
- `GET /api/inventory/items/:id` - Get specific inventory item
- `GET /api/inventory/categories` - Get inventory categories
- `GET /api/inventory/summary` - Get inventory summary

### Rankings
- `GET /api/rankings/products` - Get product rankings
- `GET /api/rankings/customers` - Get customer rankings
- `GET /api/rankings/categories` - Get category rankings
- `GET /api/rankings/summary` - Get overall rankings summary


## Database Schema

The application uses Prisma ORM with PostgreSQL. Key models include:

- **User**: Authentication and user management
- **Product**: Inventory items
- **Order**: Customer orders
- **OrderItem**: Order line items
- **Review**: Product reviews
- **Category**: Product categories

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: API rate limiting
- **JWT**: Secure authentication
- **Input Validation**: Request validation with Zod
- **Error Handling**: Comprehensive error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
