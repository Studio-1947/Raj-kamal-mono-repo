import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  setFilterLock,
  updateLockedFilterValue,
  clearFilterLock,
} from '../store/slices/filterLockSlice';
import { filterLockService } from '../services/filterLockService';

const SAVE_DEBOUNCE_MS = 500;

function getLocalCache<T>(key: string): { isLocked: boolean; filters: T } | null {
  try {
    const raw = localStorage.getItem(`rk_filter_lock_${key}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    /* ignore storage errors */
  }
  return null;
}

function setLocalCache<T>(key: string, isLocked: boolean, filters: T) {
  try {
    if (isLocked) {
      localStorage.setItem(`rk_filter_lock_${key}`, JSON.stringify({ isLocked: true, filters }));
    } else {
      localStorage.removeItem(`rk_filter_lock_${key}`);
    }
  } catch {
    /* ignore storage errors */
  }
}

export function useLockedFilters<T extends Record<string, any>>(
  key: string,
  defaultFilters: T
) {
  const dispatch = useDispatch<AppDispatch>();
  const reduxLock = useSelector((state: RootState) => state.filterLock.locks[key]);

  const [isLocked, setIsLocked] = React.useState<boolean>(() => {
    if (reduxLock?.isLocked) return true;
    const local = getLocalCache<T>(key);
    return Boolean(local?.isLocked);
  });

  const [filters, setFiltersState] = React.useState<T>(() => {
    if (reduxLock?.isLocked && reduxLock.filters) {
      return { ...defaultFilters, ...reduxLock.filters };
    }
    const local = getLocalCache<T>(key);
    if (local?.isLocked && local.filters) {
      return { ...defaultFilters, ...local.filters };
    }
    return defaultFilters;
  });

  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);

  // Sync state from backend API on mount or key change
  React.useEffect(() => {
    let active = true;

    async function fetchSavedLock() {
      const lockData = await filterLockService.getFilterLock<T>(key);
      if (!active) return;

      if (lockData?.isLocked && lockData.filters) {
        setIsLocked(true);
        const merged = { ...defaultFilters, ...lockData.filters };
        setFiltersState(merged);
        setLocalCache(key, true, merged);
        dispatch(setFilterLock({ key, isLocked: true, filters: merged }));
      }
      setIsLoaded(true);
    }

    fetchSavedLock();

    return () => {
      active = false;
    };
  }, [key, dispatch]);

  // Debounced background sync to backend API when locked filters change
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistToBackend = React.useCallback(
    (nextLocked: boolean, nextFilters: T) => {
      setLocalCache(key, nextLocked, nextFilters);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (nextLocked) {
          filterLockService.saveFilterLock(key, true, nextFilters);
        } else {
          filterLockService.deleteFilterLock(key);
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [key]
  );

  const updateFilters = React.useCallback(
    (patch: Partial<T>) => {
      setFiltersState((current) => {
        const next = { ...current, ...patch };
        if (isLocked) {
          dispatch(updateLockedFilterValue({ key, patch: patch as Record<string, any> }));
          persistToBackend(true, next);
        }
        return next;
      });
    },
    [dispatch, isLocked, key, persistToBackend]
  );

  const setFilters = React.useCallback(
    (newFilters: T) => {
      setFiltersState(newFilters);
      if (isLocked) {
        dispatch(setFilterLock({ key, isLocked: true, filters: newFilters }));
        persistToBackend(true, newFilters);
      }
    },
    [dispatch, isLocked, key, persistToBackend]
  );

  const toggleLock = React.useCallback(() => {
    setIsLocked((prevLocked) => {
      const nextLocked = !prevLocked;
      if (nextLocked) {
        dispatch(setFilterLock({ key, isLocked: true, filters }));
        setLocalCache(key, true, filters);
        filterLockService.saveFilterLock(key, true, filters);
      } else {
        dispatch(clearFilterLock(key));
        setLocalCache(key, false, filters);
        filterLockService.deleteFilterLock(key);
      }
      return nextLocked;
    });
  }, [dispatch, key, filters]);

  const resetFilters = React.useCallback(
    (overrideDefaults?: T) => {
      const targetDefaults = overrideDefaults || defaultFilters;
      setFiltersState(targetDefaults);
      if (isLocked) {
        dispatch(setFilterLock({ key, isLocked: true, filters: targetDefaults }));
        persistToBackend(true, targetDefaults);
      }
    },
    [defaultFilters, dispatch, isLocked, key, persistToBackend]
  );

  const unlock = React.useCallback(() => {
    setIsLocked(false);
    dispatch(clearFilterLock(key));
    setLocalCache(key, false, filters);
    filterLockService.deleteFilterLock(key);
  }, [dispatch, key, filters]);

  return {
    filters,
    isLocked,
    isLoaded,
    updateFilters,
    setFilters,
    toggleLock,
    resetFilters,
    unlock,
  };
}
