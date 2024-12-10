import { isArray, isEmpty } from 'lodash';

import { NestjsQuerySortDirection, NestjsQuerySortNulls } from '../types';

import type { NestjsQuerySorting } from '../types';
import type { DataProviderParams } from '@datagrid/api/types';

export function generateSorting(sorting: DataProviderParams['sorting']): NestjsQuerySorting[] {
  if (isEmpty(sorting)) {
    return [];
  }

  return sorting.reduce<NestjsQuerySorting[]>((sortingRules, { field, order }) => {
    if (!order || !field) {
      return sortingRules;
    }

    return [
      ...sortingRules,
      {
        field: isArray(field) ? field.join('.') : field,
        direction: NestjsQuerySortDirection[order],
        nulls: NestjsQuerySortNulls.Last,
      },
    ];
  }, []);
}
