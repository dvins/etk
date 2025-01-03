import type { DataGridFilter, DataGridFiltersType } from '@datagrid/types';

interface FilterActions {
  updateFilterItem: (filterKey: string, filterItemData: Partial<DataGridFilter>) => void;
  updateSelectedFilters: (newSelectedFilters: DataGridFiltersType) => void;
  updatePinnedFilters: (pinnedFilters: string[]) => void;
  initFiltersStore: (args: Omit<FiltersStore, 'actions'>) => void;
  resetFiltersStore: () => void;
}

export interface FiltersStore {
  filters: DataGridFilter[];
  defaultFilters: DataGridFiltersType;
  selectedFilters: DataGridFiltersType;
  queryFilters: DataGridFiltersType;
  pinnedFilters: string[];
  actions: FilterActions;
}
