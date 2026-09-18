import { apiClient } from "../lib/apiClient";

export interface FilterLockPayload<T = Record<string, any>> {
  isLocked: boolean;
  filters: T;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

export const filterLockService = {
  getFilterLock: async <T = Record<string, any>>(
    key: string
  ): Promise<FilterLockPayload<T> | null> => {
    try {
      const res = await apiClient.get<ApiEnvelope<FilterLockPayload<T> | null>>(
        `filter-locks/${key}`
      );
      return res.data || null;
    } catch (error) {
      console.warn(`[filterLockService] Failed to load lock for ${key}:`, error);
      return null;
    }
  },

  saveFilterLock: async <T = Record<string, any>>(
    key: string,
    isLocked: boolean,
    filters: T
  ): Promise<FilterLockPayload<T> | null> => {
    try {
      const res = await apiClient.post<ApiEnvelope<FilterLockPayload<T>>>(
        `filter-locks/${key}`,
        {
          isLocked,
          filters,
        }
      );
      return res.data || null;
    } catch (error) {
      console.warn(`[filterLockService] Failed to save lock for ${key}:`, error);
      return null;
    }
  },

  deleteFilterLock: async (key: string): Promise<boolean> => {
    try {
      await apiClient.delete<ApiEnvelope<any>>(`filter-locks/${key}`);
      return true;
    } catch (error) {
      console.warn(`[filterLockService] Failed to delete lock for ${key}:`, error);
      return false;
    }
  },
};
