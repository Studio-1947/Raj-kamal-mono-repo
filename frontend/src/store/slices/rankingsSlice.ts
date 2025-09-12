import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

export interface RankingsState {
  products: ProductRanking[];
  customers: CustomerRanking[];
  categories: CategoryRanking[];
  summary: RankingsSummary | null;
  loading: boolean;
  error: string | null;
  filters: {
    limit?: number;
    sortBy?: string;
  };
}

const initialState: RankingsState = {
  products: [],
  customers: [],
  categories: [],
  summary: null,
  loading: false,
  error: null,
  filters: {
    limit: 10,
    sortBy: 'sales',
  },
};

const rankingsSlice = createSlice({
  name: 'rankings',
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<ProductRanking[]>) => {
      state.products = action.payload;
    },
    setCustomers: (state, action: PayloadAction<CustomerRanking[]>) => {
      state.customers = action.payload;
    },
    setCategories: (state, action: PayloadAction<CategoryRanking[]>) => {
      state.categories = action.payload;
    },
    setSummary: (state, action: PayloadAction<RankingsSummary>) => {
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
      limit?: number;
      sortBy?: string;
    }>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
});

export const {
  setProducts,
  setCustomers,
  setCategories,
  setSummary,
  setLoading,
  setError,
  clearError,
  setFilters,
} = rankingsSlice.actions;

export default rankingsSlice.reducer;
