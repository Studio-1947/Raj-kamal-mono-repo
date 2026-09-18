import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  toggleFilterLock,
  updateLockedFilterValue,
  setFilterLock,
  clearFilterLock,
} from '../store/slices/filterLockSlice';

export function useLockedFilters<T extends Record<string, any>>(
  key: string,
  defaultFilters: T
) {
  const dispatch = useDispatch<AppDispatch>();
  const lockEntry = useSelector((state: RootState) => state.filterLock.locks[key]);
  const isLocked = Boolean(lockEntry?.isLocked);

  // Initialize filter state from locked entry if present, otherwise defaultFilters
  const [filters, setFiltersState] = React.useState<T>(() => {
    if (lockEntry?.isLocked && lockEntry.filters) {
      return { ...defaultFilters, ...lockEntry.filters };
    }
    return defaultFilters;
  });

  // Keep state in sync if locked filters exist in Redux on mount/navigation
  React.useEffect(() => {
    if (lockEntry?.isLocked && lockEntry.filters) {
      setFiltersState((current) => ({
        ...current,
        ...lockEntry.filters,
      }));
    }
  }, [key, lockEntry?.isLocked, lockEntry?.filters]);

  const updateFilters = React.useCallback(
    (patch: Partial<T>) => {
      setFiltersState((current) => {
        const next = { ...current, ...patch };
        if (isLocked) {
          dispatch(updateLockedFilterValue({ key, patch: patch as Record<string, any> }));
        }
        return next;
      });
    },
    [dispatch, isLocked, key]
  );

  const setFilters = React.useCallback(
    (newFilters: T) => {
      setFiltersState(newFilters);
      if (isLocked) {
        dispatch(setFilterLock({ key, isLocked: true, filters: newFilters }));
      }
    },
    [dispatch, isLocked, key]
  );

  const toggleLock = React.useCallback(() => {
    dispatch(toggleFilterLock({ key, currentFilters: filters }));
  }, [dispatch, key, filters]);

  const resetFilters = React.useCallback(
    (overrideDefaults?: T) => {
      const targetDefaults = overrideDefaults || defaultFilters;
      setFiltersState(targetDefaults);
      if (isLocked) {
        dispatch(setFilterLock({ key, isLocked: true, filters: targetDefaults }));
      }
    },
    [defaultFilters, dispatch, isLocked, key]
  );

  const unlock = React.useCallback(() => {
    dispatch(clearFilterLock(key));
  }, [dispatch, key]);

  return {
    filters,
    isLocked,
    updateFilters,
    setFilters,
    toggleLock,
    resetFilters,
    unlock,
  };
}
