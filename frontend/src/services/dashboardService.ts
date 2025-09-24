import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

// Types
export interface DashboardStats {
  totalSales: number;
  orders: number;
  customers: number;
  refunds: number;
  salesGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  refundsGrowth: number;
}

export interface Order {
  id: string;
  customer: string;
  amount: number;
  status: string;
  date: string;
}

export interface SalesChartData {
  name: string;
  month: string;
  sales: number;
  online: number;
  offline: number;
}

export interface TopBook {
  id: string;
  title: string;
  author: string;
  sales: number;
  revenue: number;
  growth: number;
}

export interface TerritoryPerformance {
  territory: string;
  sales: number;
  growth: number;
  orders: number;
}

export interface DashboardResponse {
  success: boolean;
  data: {
    stats: DashboardStats;
    recentOrders: Order[];
    salesChart: SalesChartData[];
    topBooks: TopBook[];
    territoryPerformance: TerritoryPerformance[];
  };
}

// Dashboard API functions
const dashboardApi = {
  getOverview: async (): Promise<DashboardResponse> => {
    return apiClient.get('/dashboard/overview');
  },
  getSales: async (): Promise<{ success: boolean; data: { totalSales: number; growth: number; chartData: SalesChartData[]; monthlyComparison: any } }> => {
    return apiClient.get('/dashboard/sales');
  },
  getOrders: async (): Promise<{ success: boolean; data: { totalOrders: number; growth: number; recentOrders: Order[]; ordersByStatus: any } }> => {
    return apiClient.get('/dashboard/orders');
  },
  getCustomers: async (): Promise<{ success: boolean; data: { totalCustomers: number; growth: number; newCustomers: number; returningCustomers: number; customerSegments: any } }> => {
    return apiClient.get('/dashboard/customers');
  },
  getAnalytics: async (): Promise<{ success: boolean; data: { topBooks: TopBook[]; territoryPerformance: TerritoryPerformance[]; salesTrend: SalesChartData[]; conversionRate: number; averageOrderValue: number } }> => {
    return apiClient.get('/dashboard/analytics');
  },
};

// Dashboard React Query hooks
export const useDashboardOverview = () => {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.getOverview,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useDashboardSales = () => {
  return useQuery({
    queryKey: ['dashboard', 'sales'],
    queryFn: dashboardApi.getSales,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDashboardOrders = () => {
  return useQuery({
    queryKey: ['dashboard', 'orders'],
    queryFn: dashboardApi.getOrders,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDashboardCustomers = () => {
  return useQuery({
    queryKey: ['dashboard', 'customers'],
    queryFn: dashboardApi.getCustomers,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDashboardAnalytics = () => {
  return useQuery({
    queryKey: ['dashboard', 'analytics'],
    queryFn: dashboardApi.getAnalytics,
    staleTime: 5 * 60 * 1000,
  });
};
