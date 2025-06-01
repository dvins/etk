import { isArray, isEmpty } from 'lodash';

import { CubeSortDirection, type CubeSorting } from '../types';

import type { DataProviderParams } from '@datagrid/api/types';

export const generateSorting = (sorting: DataProviderParams['sorting']): CubeSorting => {
  if (isEmpty(sorting)) {
    return {};
  }

  return sorting.reduce<CubeSorting>((sortingRules, { field, order }) => {
    if (!order || !field) {
      return sortingRules;
    }

    const sortField = isArray(field) ? field.join('.') : field;

    return {
      ...sortingRules,
      [sortField]: CubeSortDirection[order],
    };
  }, {});
};
