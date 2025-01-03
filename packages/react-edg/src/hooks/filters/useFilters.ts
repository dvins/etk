import { useFiltersStore } from '@datagrid/stores/filters';
import { uniq } from 'lodash';
import { useMemo } from 'react';

import type { DataGridFilter, DataGridFiltersType } from '@datagrid/types';

type InitAllFiltersArgs = {
  filters: DataGridFilter[];
  defaultFilters: DataGridFiltersType;
  queryFilters: DataGridFiltersType;
  selectedFilters: DataGridFiltersType;
  pinnedFilters: string[];
};

type UseFiltersReturn = {
  filters: DataGridFilter[];
  filtersMap: Record<string, DataGridFilter>;
  defaultFilters: DataGridFiltersType;
  queryFilters: DataGridFiltersType;
  selectedFilters: DataGridFiltersType;
  pinnedFilters: string[];
  updateSelectedFilters: (newSelectedFilters: DataGridFiltersType) => void;
  updatePinnedFilters: (pinnedFilters: string[]) => void;
  initAllFilters: (args: InitAllFiltersArgs) => void;
  resetAllFilters: () => void;
};

export const useFilters = (): UseFiltersReturn => {
  const { filters, updatePinnedFilters, initFiltersStore, resetFiltersStore, ...filtersStore } = useFiltersStore();

  const preservedPinnedFilters = useMemo(() => {
    return filters.reduce<string[]>((pinnedFilters, filter) => {
      const pinned = filter.showInToolbar;
      const hiddenInPanel = !filter.showInPanel;

      return pinned && hiddenInPanel ? [...pinnedFilters, filter.key] : pinnedFilters;
    }, []);
  }, [filters]);

  const setPinnedFilters = (pinnedFilters: string[]) => {
    const orderedPinnedFilters = filters.reduce<string[]>((filters, filter) => {
      return pinnedFilters.includes(filter.key) ? [...filters, filter.key] : filters;
    }, []);

    /* removing duplicates in case of mismatch  */
    const pinnedValues = uniq([...preservedPinnedFilters, ...orderedPinnedFilters]);

    updatePinnedFilters(pinnedValues);
  };

  return {
    filters,
    ...filtersStore,
    updatePinnedFilters: setPinnedFilters,
    initAllFilters: initFiltersStore,
    resetAllFilters: resetFiltersStore,
  };
};
