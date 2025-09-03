import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/dashboard';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // TODO: call backend; for now, use stub token
    login('stub-token');
    navigate(from, { replace: true });
  }

  return (
    <main className="py-10 max-w-md">
      <h1 className="text-2xl font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-600">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Sign in</button>
      </form>
    </main>
  );
}

