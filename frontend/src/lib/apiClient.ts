import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

// const DEFAULT_BASE_URL = 'https://raj-kamal-mono-repo.vercel.app/api';
const DEFAULT_BASE_URL = 'http://localhost:4000/api';

function normalizeBaseUrl(value?: string): string {
  if (!value) return DEFAULT_BASE_URL;
  return value.trim().replace(/\/+$/, '');
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: normalizeBaseUrl((import.meta as any).env?.VITE_API_URL),
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof config.url === 'string' && config.url.startsWith('/')) {
          config.url = config.url.replace(/^\/+/, '');
        }

        const token = store.getState().auth.token;
        if (token) {
          config.headers = config.headers ?? {};
          (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors and show toast notifications
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle different error types
        if (error.response?.status === 401) {
          store.dispatch(logout());
          window.location.href = '/login';
          
          // Try to show toast if available
          const event = new CustomEvent('show-toast', {
            detail: {
              message: 'Session expired. Please login again.',
              type: 'error'
            }
          });
          window.dispatchEvent(event);
        } else if (error.response?.status === 403) {
          const event = new CustomEvent('show-toast', {
            detail: {
              message: 'Access denied. You don\'t have permission to perform this action.',
              type: 'error'
            }
          });
          window.dispatchEvent(event);
        } else if (error.response?.status >= 500) {
          const event = new CustomEvent('show-toast', {
            detail: {
              message: 'Server error occurred. Please try again later.',
              type: 'error'
            }
          });
          window.dispatchEvent(event);
        } else if (!error.response) {
          const event = new CustomEvent('show-toast', {
            detail: {
              message: 'Network error. Please check your connection.',
              type: 'error'
            }
          });
          window.dispatchEvent(event);
        }
        
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
