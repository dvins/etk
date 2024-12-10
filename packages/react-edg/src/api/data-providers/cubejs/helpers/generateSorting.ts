import { isArray, isEmpty } from 'lodash';

import { CubejsSortDirection, type CubejsSorting } from '../types';

import type { DataProviderParams } from '@datagrid/api/types';

export const generateSorting = (sorting: DataProviderParams['sorting']): CubejsSorting => {
  if (isEmpty(sorting)) {
    return {};
  }

  return sorting.reduce<CubejsSorting>((sortingRules, { field, order }) => {
    if (!order || !field) {
      return sortingRules;
    }

    const sortField = isArray(field) ? field.join('.') : field;

    return {
      ...sortingRules,
      [sortField]: CubejsSortDirection[order],
    };
  }, {});
};
