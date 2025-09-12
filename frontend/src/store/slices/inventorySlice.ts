import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
  cost: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  lastUpdated: Date;
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

export interface InventoryState {
  items: InventoryItem[];
  categories: Category[];
  summary: InventorySummary | null;
  loading: boolean;
  error: string | null;
  filters: {
    category?: string;
    status?: string;
    search?: string;
  };
}

const initialState: InventoryState = {
  items: [],
  categories: [],
  summary: null,
  loading: false,
  error: null,
  filters: {},
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<InventoryItem[]>) => {
      state.items = action.payload;
    },
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
    setSummary: (state, action: PayloadAction<InventorySummary>) => {
      state.summary = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<{
      category?: string;
      status?: string;
      search?: string;
    }>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
});

export const {
  setItems,
  setCategories,
  setSummary,
  setLoading,
  setError,
  clearError,
  setFilters,
  clearFilters,
} = inventorySlice.actions;

export default inventorySlice.reducer;
