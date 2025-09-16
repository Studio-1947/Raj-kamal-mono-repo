import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { loginSuccess, logout, setUser } from '../../store/slices/authSlice';
import { useGetMe } from '../../services/authService';

type AuthContextValue = {
  isAuthenticated: boolean;
  token: string | null;
  user: any;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, token, user } = useAppSelector((state) => state.auth);
  
  // Fetch user data if token exists
  const { data: userData } = useGetMe();

  useEffect(() => {
    const storedToken = localStorage.getItem('rk_token');
    if (storedToken && !token) {
      // Token exists in localStorage but not in Redux, restore it
      dispatch(loginSuccess({ user: null, token: storedToken }));
    }
  }, [dispatch, token]);

  // Update user data when fetched
  useEffect(() => {
    if (userData?.success && userData.data.user) {
      dispatch(setUser(userData.data.user));
    }
  }, [userData, dispatch]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      token,
      user,
      login: (t: string) => {
        localStorage.setItem('rk_token', t);
        dispatch(loginSuccess({ user: null, token: t }));
      },
      logout: () => {
        localStorage.removeItem('rk_token');
        dispatch(logout());
      },
    }),
    [isAuthenticated, token, user, dispatch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

