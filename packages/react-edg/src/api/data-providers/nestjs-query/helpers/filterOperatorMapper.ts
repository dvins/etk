import { isArray, isBoolean, isNull } from 'lodash';

import type { DataGridFilterOperator } from '@datagrid/types';

const operatorMap: Record<string, string> = {
  lt: 'lt',
  gt: 'gt',
  lte: 'lte',
  gte: 'gte',
};

export const filterOperatorMapper = (operator: DataGridFilterOperator, value: any): Record<string, any> => {
  if (operator === 'in') {
    return { in: isArray(value) ? value : [value] };
  }

  if (operator === 'nin') {
    return { notIn: isArray(value) ? value : [value] };
  }

  if (operator === 'eq') {
    const operator = isNull(value) || isBoolean(value) ? 'is' : 'eq';
    return { [operator]: value };
  }

  if (operator === 'ne') {
    const operator = isNull(value) || isBoolean(value) ? 'isNot' : 'ne';
    return { [operator]: value };
  }

  if (operator === 'contains') {
    return { iLike: `%${value}%` };
  }

  if (operator === 'ncontains') {
    return { notILike: `%${value}%` };
  }

  if (operator === 'containss') {
    return { like: `%${value}%` };
  }

  if (operator === 'ncontainss') {
    return { notLike: `%${value}%` };
  }

  if (operator === 'startswith') {
    return { iLike: `${value}%` };
  }

  if (operator === 'nstartswith') {
    return { notILike: `${value}%` };
  }

  if (operator === 'startswiths') {
    return { like: `${value}%` };
  }

  if (operator === 'nstartswiths') {
    return { notLike: `${value}%` };
  }

  if (operator === 'endswith') {
    return { iLike: `%${value}` };
  }

  if (operator === 'nendswith') {
    return { notILike: `%${value}` };
  }

  if (operator === 'endswiths') {
    return { like: `%${value}` };
  }

  if (operator === 'nendswiths') {
    return { notLike: `%${value}` };
  }

  if (operator === 'null') {
    return { is: null };
  }

  if (operator === 'nnull') {
    return { isNot: null };
  }

  if (operator === 'between') {
    if (!Array.isArray(value) || value.length !== 2) {
      return {};
    }

    return { between: { lower: value[0], upper: value[1] } };
  }

  if (operator === 'nbetween') {
    if (!Array.isArray(value)) {
      throw new Error('NBetween operator requires an array');
    }

    if (value.length !== 2) {
      return {};
    }

    return { notBetween: { lower: value[0], upper: value[1] } };
  }

  return { [operatorMap[operator]]: value };
};
