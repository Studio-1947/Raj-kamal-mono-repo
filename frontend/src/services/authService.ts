import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { store } from '../store';
import { loginSuccess, loginFailure, setUser, logout, User as AuthUser } from '../store/slices/authSlice';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: AuthUser;
    token: string;
  };
}

// Auth API functions
const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return apiClient.post('/auth/login', credentials);
  },
  register: async (data: RegisterData): Promise<AuthResponse> => {
    return apiClient.post('/auth/register', data);
  },
  getMe: async (): Promise<{ success: boolean; data: { user: AuthUser } }> => {
    return apiClient.get('/auth/me');
  },
  logout: async (): Promise<{ success: boolean; message: string }> => {
    return apiClient.post('/auth/logout');
  },
};

// Auth React Query hooks
export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data: AuthResponse) => {
      if (data.success) {
        store.dispatch(loginSuccess(data.data));
        queryClient.invalidateQueries({ queryKey: ['auth'] });
      }
    },
    onError: (error: any) => {
      store.dispatch(loginFailure(error.response?.data?.error || 'Login failed'));
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data: AuthResponse) => {
      if (data.success) {
        store.dispatch(loginSuccess(data.data));
        queryClient.invalidateQueries({ queryKey: ['auth'] });
      }
    },
    onError: (error: any) => {
      store.dispatch(loginFailure(error.response?.data?.error || 'Registration failed'));
    },
  });
};

export const useGetMe = () => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: !!store.getState().auth.token,
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      store.dispatch(logout());
      queryClient.clear();
    },
  });
};