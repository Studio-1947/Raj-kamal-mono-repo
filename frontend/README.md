# Raj-Kamal Frontend

A modern React application with Redux Toolkit and React Query for state management and data fetching.

## 🚀 Features

- **⚛️ React 18** with TypeScript
- **🔄 Redux Toolkit** for state management
- **📡 React Query (TanStack Query)** for server state management
- **🎨 Tailwind CSS** for styling
- **🛣️ React Router** for navigation
- **📊 Recharts** for data visualization
- **🔐 JWT Authentication** with Redux integration
- **🌐 Axios** for API calls with interceptors
- **🛠️ Vite** for fast development and building

## 📦 Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit
- **Server State**: React Query (TanStack Query)
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Build Tool**: Vite
- **Icons**: React Icons

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable components
│   │   └── examples/        # Example components
│   ├── hooks/               # Custom hooks
│   │   └── redux.ts        # Redux typed hooks
│   ├── lib/                # Utility libraries
│   │   ├── apiClient.ts    # Axios configuration
│   │   └── queryClient.ts  # React Query configuration
│   ├── modules/            # Feature modules
│   │   ├── auth/          # Authentication
│   │   └── lang/          # Language/i18n
│   ├── routes/            # Route components
│   ├── services/          # API service layers
│   │   ├── authService.ts
│   │   ├── dashboardService.ts
│   │   ├── inventoryService.ts
│   │   └── rankingsService.ts
│   ├── shared/            # Shared components
│   ├── store/             # Redux store
│   │   ├── index.ts       # Store configuration
│   │   └── slices/        # Redux slices
│   │       ├── authSlice.ts
│   │       ├── dashboardSlice.ts
│   │       ├── inventorySlice.ts
│   │       ├── rankingsSlice.ts
│   │       └── uiSlice.ts
│   ├── views/             # Page components
│   ├── index.css          # Global styles
│   └── main.tsx           # App entry point
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── env.example
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your API URL
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:4000/api` |
| `VITE_APP_NAME` | Application name | `Raj-Kamal` |
| `VITE_APP_VERSION` | Application version | `1.0.0` |
| `VITE_DEV_MODE` | Development mode flag | `true` |

### Redux Store

The Redux store is configured with the following slices:

- **auth**: User authentication state
- **dashboard**: Dashboard data and statistics
- **inventory**: Inventory management state
- **rankings**: Rankings and analytics data
- **ui**: UI state (sidebar, theme, notifications)

### React Query

React Query is configured with:
- 5-minute stale time for queries
- 10-minute cache time
- Automatic retry logic (3 attempts)
- Error handling for 4xx responses
- DevTools integration

## 📡 API Integration

### Service Layer

Each feature has its own service file with React Query hooks:

```typescript
// Example: Using dashboard service
import { useDashboardOverview } from '../services/dashboardService';

function Dashboard() {
  const { data, isLoading, error } = useDashboardOverview();
  
  if (isLoading) return <Loading />;
  if (error) return <Error />;
  
  return <DashboardContent data={data} />;
}
```

### Authentication

Authentication is handled through:
- Redux auth slice for state management
- AuthContext for component-level access
- Axios interceptors for automatic token handling
- React Query hooks for auth operations

```typescript
// Login example
import { useLogin } from '../services/authService';

function LoginForm() {
  const loginMutation = useLogin();
  
  const handleSubmit = (credentials) => {
    loginMutation.mutate(credentials);
  };
}
```

## 🎨 Styling

The project uses Tailwind CSS for styling with:
- Custom configuration in `tailwind.config.ts`
- Global styles in `index.css`
- Responsive design utilities
- Dark mode support (configurable)

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Redux DevTools

Redux DevTools are enabled in development mode for debugging state changes.

### React Query DevTools

React Query DevTools are available in development for inspecting queries, mutations, and cache.

## 🔐 Authentication Flow

1. **Login**: User submits credentials → API call → JWT token stored in Redux and localStorage
2. **Token Refresh**: Automatic token validation on app load
3. **Protected Routes**: Route guards check authentication state
4. **Logout**: Clear token from Redux and localStorage

## 📊 State Management Patterns

### Redux for Client State
- UI state (sidebar, theme, notifications)
- User preferences
- Form state
- Navigation state

### React Query for Server State
- API data fetching
- Caching and synchronization
- Background updates
- Optimistic updates

## 🧪 Testing

The project is set up for testing with:
- TypeScript for type safety
- ESLint for code quality
- Redux DevTools for debugging
- React Query DevTools for API debugging

## 📦 Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory, ready for deployment.

## 🚀 Deployment

The frontend can be deployed to any static hosting service:
- Netlify
- Vercel
- AWS S3 + CloudFront
- GitHub Pages

Make sure to set the correct `VITE_API_URL` environment variable for your backend API.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
