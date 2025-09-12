import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

// Types
export interface ProductRanking {
  id: string;
  name: string;
  sku: string;
  sales: number;
  revenue: number;
  rank: number;
  change: number;
}

export interface CustomerRanking {
  id: string;
  name: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  rank: number;
  change: number;
}

export interface CategoryRanking {
  id: string;
  name: string;
  totalSales: number;
  totalRevenue: number;
  rank: number;
  change: number;
}

export interface RankingsSummary {
  topProduct: {
    name: string;
    sales: number;
    revenue: number;
  };
  topCustomer: {
    name: string;
    totalSpent: number;
    totalOrders: number;
  };
  topCategory: {
    name: string;
    totalSales: number;
    totalRevenue: number;
  };
}

export interface ProductRankingsResponse {
  success: boolean;
  data: {
    products: ProductRanking[];
    total: number;
  };
}

export interface CustomerRankingsResponse {
  success: boolean;
  data: {
    customers: CustomerRanking[];
    total: number;
  };
}

export interface CategoryRankingsResponse {
  success: boolean;
  data: {
    categories: CategoryRanking[];
    total: number;
  };
}

export interface RankingsSummaryResponse {
  success: boolean;
  data: RankingsSummary;
}

// Rankings API functions
const rankingsApi = {
  getProducts: async (params?: { limit?: number; sortBy?: string }): Promise<ProductRankingsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    
    const url = queryParams.toString() ? `/rankings/products?${queryParams}` : '/rankings/products';
    return apiClient.get(url);
  },
  getCustomers: async (params?: { limit?: number; sortBy?: string }): Promise<CustomerRankingsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    
    const url = queryParams.toString() ? `/rankings/customers?${queryParams}` : '/rankings/customers';
    return apiClient.get(url);
  },
  getCategories: async (): Promise<CategoryRankingsResponse> => {
    return apiClient.get('/rankings/categories');
  },
  getSummary: async (): Promise<RankingsSummaryResponse> => {
    return apiClient.get('/rankings/summary');
  },
};

// Rankings React Query hooks
export const useProductRankings = (params?: { limit?: number; sortBy?: string }) => {
  return useQuery({
    queryKey: ['rankings', 'products', params],
    queryFn: () => rankingsApi.getProducts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCustomerRankings = (params?: { limit?: number; sortBy?: string }) => {
  return useQuery({
    queryKey: ['rankings', 'customers', params],
    queryFn: () => rankingsApi.getCustomers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCategoryRankings = () => {
  return useQuery({
    queryKey: ['rankings', 'categories'],
    queryFn: rankingsApi.getCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useRankingsSummary = () => {
  return useQuery({
    queryKey: ['rankings', 'summary'],
    queryFn: rankingsApi.getSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
