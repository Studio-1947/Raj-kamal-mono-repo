// Global window extensions for analytics
declare global {
  function gtag(...args: any[]): void;
  
  interface Window {
    gtag: typeof gtag;
    dataLayer: any[];
  }
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common Entity Types
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  description?: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface Category extends BaseEntity {
  name: string;
  description?: string;
}

export interface Order extends BaseEntity {
  orderNumber: string;
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  user?: User;
  items?: OrderItem[];
}

export interface OrderItem extends BaseEntity {
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product?: Product;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface ProductForm {
  name: string;
  sku: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
}

// Filter and Sort Types
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  [key: string]: any;
}

// Chart Data Types
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

// Notification Types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export {};