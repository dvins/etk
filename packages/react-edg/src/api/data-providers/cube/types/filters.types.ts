import type {
  BinaryOperator,
  UnaryOperator,
  Filter,
  BinaryFilter,
  UnaryFilter,
  LogicalAndFilter,
  LogicalOrFilter,
} from '@cubejs-client/core';

export type CubeFilterOperator = BinaryOperator | UnaryOperator | 'and' | 'or';

export type CubeFilter = Filter;

export type CubeBinaryFilter = BinaryFilter;
export type CubeUnaryFilter = UnaryFilter;
export type CubeLogicalAndFilter = LogicalAndFilter;
export type CubeLogicalOrFilter = LogicalOrFilter;
