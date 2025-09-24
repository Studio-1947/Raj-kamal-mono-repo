import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { store } from './store';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './modules/auth/AuthContext';
import { LangProvider } from './modules/lang/LangContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';
import './index.css';

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LangProvider>
              <ToastProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </ToastProvider>
            </LangProvider>
          </AuthProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
