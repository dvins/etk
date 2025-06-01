import { isArray, isNil } from 'lodash';

import { fieldToString } from './fieldToString';
import { operatorMap } from './filterOperatorMap';

import type {
  CubeBinaryFilter,
  CubeFilter,
  CubeFilterOperator,
  CubeLogicalAndFilter,
  CubeLogicalOrFilter,
  CubeUnaryFilter,
} from '../types';
import type { DataProviderParams } from '@datagrid/api/types';

export const generateFilters = (
  filters: DataProviderParams['filters'],
  omitFilterFields?: string[],
): CubeFilter[] => {
  return filters
    .filter((filter) => {
      if (omitFilterFields?.includes(fieldToString(filter.field))) {
        return false;
      }

      if (Array.isArray(filter.value) && filter.value.length === 0) {
        return false;
      }

      if (typeof filter.value === 'number') {
        return Number.isFinite(filter.value);
      }

      return !isNil(filter.value);
    })
    .map((filter) => {
      const filtersArray = isArray(filter.value) ? filter.value : [filter.value];
      const member = fieldToString(filter.field);

      if (filter.operator === 'in') {
        return {
          or: filtersArray.map((value) => ({
            member,
            operator: 'equals',
            values: [value],
          })),
        };
      }

      const operator: CubeFilterOperator = operatorMap[filter.operator] ?? 'equals';

      if (operator === 'or' || operator === 'and') {
        const nestedFilters = generateFilters(filtersArray);
        return {
          [operator]: nestedFilters,
        } as CubeLogicalAndFilter | CubeLogicalOrFilter;
      }

      if (operator === 'set' || operator === 'notSet') {
        return {
          member,
          operator,
        } satisfies CubeUnaryFilter;
      }

      const values: string[] = isArray(filter.value) ? filter.value : [filter.value];

      return {
        member,
        operator,
        values,
      } satisfies CubeBinaryFilter;
    });
};
