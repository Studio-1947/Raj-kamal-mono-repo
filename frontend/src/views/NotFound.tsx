import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="py-10">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="mt-3 text-gray-600">Page not found.</p>
      <Link className="mt-4 inline-block text-blue-600" to="/">Go home</Link>
    </main>
  );
}

