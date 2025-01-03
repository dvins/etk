import { toArray } from '@datagrid/utils/common';

import type { DataGridFiltersType, FilterValue } from '@datagrid/types';

export const removeFilterByValue = (
  filterKey: string,
  selectedFilters: DataGridFiltersType,
  value: FilterValue,
): DataGridFiltersType =>
  Object.keys(selectedFilters).reduce<DataGridFiltersType>((newFilters, currentFilterKey) => {
    if (filterKey !== currentFilterKey) {
      return {
        ...newFilters,
        [currentFilterKey]: selectedFilters[currentFilterKey],
      };
    }

    const filterValue = selectedFilters[filterKey]?.value;
    const updatedFilterValue = toArray(filterValue).filter((valueEl) => valueEl !== value);

    if (!updatedFilterValue.length) {
      return newFilters;
    }

    return {
      ...newFilters,
      [filterKey]: {
        field: selectedFilters[filterKey]?.field,
        value: updatedFilterValue,
        operator: selectedFilters[filterKey]?.operator,
      },
    };
  }, {});

export const removeFilter = (filterKey: string, selectedFilters: DataGridFiltersType): DataGridFiltersType =>
  Object.keys(selectedFilters).reduce<DataGridFiltersType>((newFilters, currentFilterKey) => {
    if (filterKey !== currentFilterKey) {
      return {
        ...newFilters,
        [currentFilterKey]: selectedFilters[currentFilterKey],
      };
    }

    return newFilters;
  }, {});
