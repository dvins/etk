import type {
  BinaryOperator,
  UnaryOperator,
  Filter,
  BinaryFilter,
  UnaryFilter,
  LogicalAndFilter,
  LogicalOrFilter,
} from '@cubejs-client/core';

export type CubejsFilterOperator = BinaryOperator | UnaryOperator | 'and' | 'or';

export type CubejsFilter = Filter;

export type CubejsBinaryFilter = BinaryFilter;
export type CubejsUnaryFilter = UnaryFilter;
export type CubejsLogicalAndFilter = LogicalAndFilter;
export type CubejsLogicalOrFilter = LogicalOrFilter;
