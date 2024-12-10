import type { DataGridFilterOperator } from './filterOperators.types';
import type { FilterValue } from './filters.types';
import type { DataGridSortOrder } from './sorting.types';

export type DataGridParametersFilter = {
  field: string | string[];
  value: FilterValue;
  operator: DataGridFilterOperator;
};

type DataGridParametersSorting = {
  field?: string | string[];
  order?: DataGridSortOrder;
};

type DataGridParametersPaging = {
  current?: number;
  pageSize?: number;
};

export interface DataGridParameters {
  filters: DataGridParametersFilter[];
  sorting: DataGridParametersSorting[];
  paging: DataGridParametersPaging;
}
