import type { CubejsFilterOperator } from '../types';
import type { DataGridFilterOperator } from '@datagrid/types';

export const operatorMap: Partial<Record<DataGridFilterOperator, CubejsFilterOperator>> = {
  eq: 'equals',
  ne: 'notEquals',
  lt: 'lt',
  lte: 'lte',
  gt: 'gt',
  gte: 'gte',
  contains: 'contains',
  ncontains: 'notContains',
  startswith: 'startsWith',
  endswith: 'endsWith',
  null: 'set', // Use 'set' for null-checking
  nnull: 'notSet', // Use 'notSet' for not-null-checking
  or: 'or',
  and: 'and',
};
