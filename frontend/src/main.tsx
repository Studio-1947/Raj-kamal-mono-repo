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
import AppRoutes from './routes/AppRoutes';
import './index.css';


const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LangProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </LangProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
