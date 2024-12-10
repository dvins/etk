import type { PinStatus } from './columnsManager.types';
import type { TableData } from './data.types';
import type { DataGridFiltersType, FilterValue } from './filters.types';
import type { DataGridSortOrder, DataGridSorterResult } from './sorting.types';
import type { DataGridColumn } from './table.types';
import type React from 'react';

export type ViewConfigColumn = {
  key: string;
  visible: boolean;
  pinned: PinStatus;
  sortOrder?: DataGridSortOrder;
};

export type ViewConfigFilter = {
  key: string;
  value?: FilterValue;
  pinned?: boolean;
};

export type ViewConfigValue = {
  columns: ViewConfigColumn[];
  filters: ViewConfigFilter[];
};

export interface ViewConfig {
  label: string;
  key: string;
  value: ViewConfigValue;
}

export interface ViewSelectOption {
  label: string;
  key: string;
  value: string;
}

export type DataGridView<TData extends TableData> = {
  key: string;
  columns: DataGridColumn<TData>[];
  selectedFilters: DataGridFiltersType;
  pinnedFilters: React.Key[];
  sorting: DataGridSorterResult<TData>[];
};
