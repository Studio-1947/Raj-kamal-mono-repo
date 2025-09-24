// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile'
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    UPDATE_ROLE: (id: string) => `/users/${id}/role`
  },
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id: string) => `/products/${id}`,
    SEARCH: '/products/search',
    CATEGORIES: '/products/categories',
    BULK_UPDATE: '/products/bulk-update'
  },
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id: string) => `/orders/${id}`,
    BY_USER: (userId: string) => `/orders/user/${userId}`,
    STATUS_UPDATE: (id: string) => `/orders/${id}/status`
  },
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    SALES: '/analytics/sales',
    TRACK: '/analytics/track'
  }
} as const;

// Application Configuration
export const APP_CONFIG = {
  NAME: 'Raj Kamal',
  VERSION: '1.0.0',
  DESCRIPTION: 'Hindi Literature Digital Platform',
  SUPPORT_EMAIL: 'support@rajkamal.local',
  COMPANY_NAME: 'Raj Kamal Publications',
  DEFAULT_LANGUAGE: 'hi',
  SUPPORTED_LANGUAGES: ['en', 'hi'],
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
    PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
  },
  FILE_UPLOAD: {
    MAX_SIZE_MB: 5,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  },
  UI: {
    DEBOUNCE_DELAY: 300,
    TOAST_DURATION: 5000,
    LOADING_DELAY: 200,
    ANIMATION_DURATION: 200
  }
} as const;

// Status Options
export const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'yellow' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'blue' },
  { value: 'PROCESSING', label: 'Processing', color: 'purple' },
  { value: 'SHIPPED', label: 'Shipped', color: 'indigo' },
  { value: 'DELIVERED', label: 'Delivered', color: 'green' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'red' }
] as const;

export const PRODUCT_STATUSES = [
  { value: 'IN_STOCK', label: 'In Stock', color: 'green' },
  { value: 'LOW_STOCK', label: 'Low Stock', color: 'yellow' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock', color: 'red' }
] as const;

export const USER_ROLES = [
  { value: 'USER', label: 'Customer' },
  { value: 'ADMIN', label: 'Administrator' }
] as const;

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGE: 'Please enter a valid email address'
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    MESSAGE: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
  },
  PHONE: {
    PATTERN: /^\+?[\d\s\-\(\)]+$/,
    MESSAGE: 'Please enter a valid phone number'
  },
  SKU: {
    PATTERN: /^[A-Z0-9\-]+$/,
    MESSAGE: 'SKU must contain only uppercase letters, numbers, and hyphens'
  },
  PRICE: {
    MIN: 0.01,
    MAX: 999999.99,
    MESSAGE: 'Price must be between ₹0.01 and ₹999,999.99'
  }
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'raj_kamal_auth_token',
  USER_PREFERENCES: 'raj_kamal_user_preferences',
  LANGUAGE: 'raj_kamal_language',
  THEME: 'raj_kamal_theme',
  SIDEBAR_STATE: 'raj_kamal_sidebar_state',
  TABLE_PREFERENCES: 'raj_kamal_table_preferences'
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You don\'t have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An internal server error occurred. Please try again later.',
  VALIDATION: 'Please check your input and try again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit.',
  INVALID_FILE_TYPE: 'This file type is not supported.'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Welcome back! You have been successfully logged in.',
  LOGOUT: 'You have been successfully logged out.',
  SAVE: 'Your changes have been saved successfully.',
  DELETE: 'Item has been deleted successfully.',
  UPLOAD: 'File uploaded successfully.',
  UPDATE: 'Information updated successfully.',
  CREATE: 'Item created successfully.'
} as const;