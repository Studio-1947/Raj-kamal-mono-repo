import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../views/Home';
import Dashboard from '../views/Dashboard';
import NotFound from '../views/NotFound';
import Inventory from '../views/Inventory';
import Rankings from '../views/Rankings';
import Social from '../views/Social';
import Settings from '../views/Settings';
import Language from '../views/Language';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/rankings" element={<Rankings />} />
      <Route path="/social" element={<Social />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/language" element={<Language />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
