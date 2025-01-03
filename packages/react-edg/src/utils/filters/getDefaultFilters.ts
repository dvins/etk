import type { DataGridFilter, DataGridFilterValue, DataGridFiltersType } from '@datagrid/types';

export const getDefaultFilters = (filters: DataGridFilter[]): DataGridFiltersType =>
  filters.reduce<DataGridFiltersType>((defaultFilters, filter) => {
    if (!filter.defaultValue) {
      return defaultFilters;
    }

    let filterValue: DataGridFilterValue | null;

    /* Check if the value can be formatted by the granted transform function */
    try {
      filterValue = {
        field: filter.field,
        value: filter.fromFilterParams(filter.defaultValue),
        operator: filter.operator,
      };
    } catch (error) {
      filterValue = null;
    }

    return {
      ...defaultFilters,
      ...(filterValue ? { [filter.key]: filterValue } : {}),
    };
  }, {});
