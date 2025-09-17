import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { loginSuccess, logout, setUser } from '../../store/slices/authSlice';
import { useGetMe } from '../../services/authService';

type AuthContextValue = {
  isAuthenticated: boolean;
  token: string | null;
  user: any;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { token, user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  
  const { data: userData, isLoading: userLoading } = useGetMe(!!token);

  useEffect(() => {
    const storedToken = localStorage.getItem('rk_token');
    if (storedToken && !token) {
      dispatch(loginSuccess({ token: storedToken, user: null }));
    } else {
      setLoading(false);
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (userData && token) {
      dispatch(setUser(userData.data.user));
    }
    if (!userLoading && token) {
      setLoading(false);
    }
  }, [userData, userLoading, token, dispatch]);

  const login = (token: string) => {
    localStorage.setItem('rk_token', token);
    dispatch(loginSuccess({ token, user: null }));
  };

  const handleLogout = () => {
    localStorage.removeItem('rk_token');
    dispatch(logout());
  };

  const value: AuthContextValue = {
    isAuthenticated: isAuthenticated && !!user,
    token,
    user,
    login,
    logout: handleLogout,
    loading: loading || userLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

