import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { logout, loginSuccess } from './authSlice';

export interface LockedFilterEntry<T = any> {
  isLocked: boolean;
  filters: T | null;
}

export interface FilterLockState {
  locks: Record<string, LockedFilterEntry>;
}

const initialState: FilterLockState = {
  locks: {},
};

const filterLockSlice = createSlice({
  name: 'filterLock',
  initialState,
  reducers: {
    toggleFilterLock: (
      state,
      action: PayloadAction<{ key: string; currentFilters: Record<string, any> }>
    ) => {
      const { key, currentFilters } = action.payload;
      const existing = state.locks[key];
      const nextLockedState = !existing?.isLocked;

      state.locks[key] = {
        isLocked: nextLockedState,
        filters: nextLockedState ? { ...currentFilters } : null,
      };
    },
    setFilterLock: (
      state,
      action: PayloadAction<{ key: string; isLocked: boolean; filters?: Record<string, any> }>
    ) => {
      const { key, isLocked, filters } = action.payload;
      state.locks[key] = {
        isLocked,
        filters: isLocked ? (filters ? { ...filters } : (state.locks[key]?.filters || null)) : null,
      };
    },
    updateLockedFilterValue: (
      state,
      action: PayloadAction<{ key: string; patch: Record<string, any> }>
    ) => {
      const { key, patch } = action.payload;
      if (state.locks[key]?.isLocked && state.locks[key].filters) {
        state.locks[key].filters = {
          ...state.locks[key].filters,
          ...patch,
        };
      }
    },
    clearFilterLock: (state, action: PayloadAction<string>) => {
      delete state.locks[action.payload];
    },
    clearAllFilterLocks: (state) => {
      state.locks = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logout, (state) => {
        state.locks = {};
      })
      .addCase(loginSuccess, (state) => {
        state.locks = {};
      });
  },
});

export const {
  toggleFilterLock,
  setFilterLock,
  updateLockedFilterValue,
  clearFilterLock,
  clearAllFilterLocks,
} = filterLockSlice.actions;

export default filterLockSlice.reducer;
