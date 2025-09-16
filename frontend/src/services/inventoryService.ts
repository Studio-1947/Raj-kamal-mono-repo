import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

// Types
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
  cost: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  lastUpdated: string;
}

export interface Category {
  id: string;
  name: string;
  itemCount: number;
}

export interface InventorySummary {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  inStockItems: number;
}

export interface InventoryItemsResponse {
  success: boolean;
  data: {
    items: InventoryItem[];
    total: number;
  };
}

export interface InventoryCategoriesResponse {
  success: boolean;
  data: {
    categories: Category[];
  };
}

export interface InventorySummaryResponse {
  success: boolean;
  data: InventorySummary;
}

export interface InventoryItemResponse {
  success: boolean;
  data: {
    item: InventoryItem;
  };
}

// Inventory API functions
const inventoryApi = {
  getItems: async (params?: { category?: string; status?: string; search?: string }): Promise<InventoryItemsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    
    const url = queryParams.toString() ? `/inventory/items?${queryParams}` : '/inventory/items';
    return apiClient.get(url);
  },
  getItem: async (id: string): Promise<InventoryItemResponse> => {
    return apiClient.get(`/inventory/items/${id}`);
  },
  getCategories: async (): Promise<InventoryCategoriesResponse> => {
    return apiClient.get('/inventory/categories');
  },
  getSummary: async (): Promise<InventorySummaryResponse> => {
    return apiClient.get('/inventory/summary');
  },
};

// Inventory React Query hooks
export const useInventoryItems = (params?: { category?: string; status?: string; search?: string }) => {
  return useQuery({
    queryKey: ['inventory', 'items', params],
    queryFn: () => inventoryApi.getItems(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useInventoryItem = (id: string) => {
  return useQuery({
    queryKey: ['inventory', 'item', id],
    queryFn: () => inventoryApi.getItem(id),
    enabled: !!id,
  });
};

export const useInventoryCategories = () => {
  return useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: inventoryApi.getCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useInventorySummary = () => {
  return useQuery({
    queryKey: ['inventory', 'summary'],
    queryFn: inventoryApi.getSummary,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
