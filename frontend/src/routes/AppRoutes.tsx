import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  Home,
  Dashboard,
  NotFound,
  Inventory,
  Stock,
  Rankings,
  Social,
  Settings,
  Language,
  Login,
  OfflineSheetSales,
} from "../views";
import ProtectedRoute from "../components/ProtectedRoute";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public route - Login page */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/offline-sheet-sales" replace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <Stock />
          </ProtectedRoute>
        }
      />

      <Route
        path="/rankings"
        element={
          <ProtectedRoute>
            <Rankings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/social"
        element={
          <ProtectedRoute>
            <Social />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/language"
        element={
          <ProtectedRoute>
            <Language />
          </ProtectedRoute>
        }
      />

      <Route
        path="/offline-sheet-sales"
        element={
          <ProtectedRoute>
            <OfflineSheetSales />
          </ProtectedRoute>
        }
      />

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
