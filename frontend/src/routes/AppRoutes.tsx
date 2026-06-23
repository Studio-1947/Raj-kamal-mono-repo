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
  MumbaiOfflineSales,
  PatnaOfflineSales,
  OnlineOfflineSales,
  BookFairOfflineSales,
  LokbhartiOfflineSales,
  TotalOfflineSales,
  GeoInsights,
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
            <TotalOfflineSales />
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
      <Route
        path="/mumbai-offline-sales"
        element={
          <ProtectedRoute>
            <MumbaiOfflineSales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patna-offline-sales"
        element={
          <ProtectedRoute>
            <PatnaOfflineSales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/online-offline-sales"
        element={
          <ProtectedRoute>
            <OnlineOfflineSales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookfair-offline-sales"
        element={
          <ProtectedRoute>
            <BookFairOfflineSales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lokbharti-offline-sales"
        element={
          <ProtectedRoute>
            <LokbhartiOfflineSales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/geo-insights"
        element={
          <ProtectedRoute>
            <GeoInsights />
          </ProtectedRoute>
        }
      />

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
