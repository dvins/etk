import { isNil } from 'lodash';

import type { DataGridFilter, DataGridFiltersType } from '@datagrid/types';

export const transformFiltersToQueryParams = (
  selectedFilters: DataGridFiltersType,
  filtersMap: Record<string, DataGridFilter>,
) => {
  return Object.keys(selectedFilters).reduce<Record<string, any>>((queryFilterParams, filterKey) => {
    const filterValue = selectedFilters[filterKey];
    /* Get the method to convert to query filter value */
    const toFilterParams = filtersMap[filterKey]?.toFilterParams;
    const value = toFilterParams ? toFilterParams(filterValue) : filterValue;

    if (isNil(value)) {
      return {
        ...queryFilterParams,
      };
    }

    return {
      ...queryFilterParams,
      [filterKey]: value,
    };
  }, {});
};
