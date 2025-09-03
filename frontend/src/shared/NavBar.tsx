import { Link } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';

export default function NavBar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <Link className="font-semibold" to="/">RK</Link>
        <Link className="text-sm text-gray-500 hover:text-gray-900" to="/">Home</Link>
        <Link className="text-sm text-gray-500 hover:text-gray-900" to="/dashboard">Dashboard</Link>
      </div>
      <div>
        {isAuthenticated ? (
          <button onClick={logout} className="text-sm text-red-600 hover:underline">Logout</button>
        ) : (
          <Link className="text-sm text-blue-600 hover:underline" to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}

