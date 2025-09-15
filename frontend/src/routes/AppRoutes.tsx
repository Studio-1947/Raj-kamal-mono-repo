import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../views/Home';
import Dashboard from '../views/Dashboard';
import NotFound from '../views/NotFound';
import Inventory from '../views/Inventory';
import Rankings from '../views/Rankings';
import Social from '../views/Social';
import Settings from '../views/Settings';
import Language from '../views/Language';
import Login from '../views/Login';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/rankings" element={<ProtectedRoute><Rankings /></ProtectedRoute>} />
      <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/language" element={<ProtectedRoute><Language /></ProtectedRoute>} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
