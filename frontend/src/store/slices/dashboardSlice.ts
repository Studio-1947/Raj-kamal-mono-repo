import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
  date: Date;
}

export interface SalesChartData {
  month: string;
  sales: number;
}

export interface DashboardState {
  stats: DashboardStats | null;
  recentOrders: Order[];
  salesChart: SalesChartData[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  stats: null,
  recentOrders: [],
  salesChart: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDashboardData: (state, action: PayloadAction<{
      stats: DashboardStats;
      recentOrders: Order[];
      salesChart: SalesChartData[];
    }>) => {
      state.stats = action.payload.stats;
      state.recentOrders = action.payload.recentOrders;
      state.salesChart = action.payload.salesChart;
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
  },
});

export const {
  setDashboardData,
  setLoading,
  setError,
  clearError,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
