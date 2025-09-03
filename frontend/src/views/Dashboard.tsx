import { useAuth } from '../modules/auth/AuthContext';

export default function Dashboard() {
  const { token } = useAuth();
  return (
    <main className="py-10">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-3 text-gray-600">You are logged in.</p>
      <pre className="mt-4 rounded bg-gray-100 p-3 text-xs text-gray-700">{token}</pre>
    </main>
  );
}

