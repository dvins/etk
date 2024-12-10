/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { isArray, isNil, set } from 'lodash';

import { fieldToString } from './fieldToString';
import { filterOperatorMapper } from './filterOperatorMapper';

import type { DataProviderParams, NestjsQueryDataProviderFilterAdapter } from '@datagrid/api/types';
import { DataGridParametersFilter } from '@datagrid/types';

export const generateFilters = (
  filters: DataProviderParams['filters'],
  filterAdapters?: NestjsQueryDataProviderFilterAdapter[],
) => {
  const result: Record<string, Record<string, string | number>> = {};
  const filterAdaptersMap =
    filterAdapters?.reduce <
    Record<string, any>>(
      (acc, filterAdapter) => ({
        ...acc,
        [fieldToString(filterAdapter.field)]: filterAdapter.adapter,
      }),
      {},
    );

  filters
    .map((filter) => {
      // Allow filter adapters to handle arrays of fields by converting them to strings
      const field = fieldToString(filter.field);
      // Run the filter through the adapter if it exists
      const transformedFilter = filterAdaptersMap?.[field]?.(filter);
      return transformedFilter ?? filter;
    })
    .filter((filter) => {
      if (Array.isArray(filter.value) && filter.value.length === 0) {
        return false;
      }

      if (typeof filter.value === 'number') {
        return Number.isFinite(filter.value);
      }

      return !isNil(filter.value);
    })
    .map((filter) => {
      if (filter.operator === 'and' || filter.operator === 'or') {
        const filtersArray: DataGridParametersFilter[] = isArray(filter.value) ? filter.value : [filter.value];
        const nestedFilters = filtersArray.map((subFilter) => generateFilters([subFilter]));
        return set(result, filter.operator, nestedFilters);
      }

      if (filter.field) {
        return set(result, filter.field, filterOperatorMapper(filter.operator, filter.value));
      }

      return {};
    });

  return result;
};
