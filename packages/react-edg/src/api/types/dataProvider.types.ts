import type { Query, TimeDimension } from '@cubejs-client/core';
import type { DataGridParameters, DataGridParametersFilter } from '@datagrid/types';
import type { DocumentNode } from 'graphql';

export type DataProviderParams = DataGridParameters;

type DataProviderParamsFilter = DataGridParametersFilter;

export type DataProviderListParams = DataProviderParams;

export type DataProviderCreateParams = {
  variables: Record<string, any>;
};

export interface DataProviderUpdateParams {
  variables: Record<string, any>;
}

export interface DataProviderDeleteParams {
  variables: Record<string, any>;
}

export type DataProviderMeta = Record<string, any>;

export type DataProviderMutationMeta<TData> = {
  onSuccess?: (data?: TData) => void;
  onError?: (error: unknown) => void;
  onSettled?: (data?: TData, error?: unknown) => void;
};

export interface DataProviderListResponse<TData> {
  data: TData[];
  totalCount: number;
}

export interface DataProvider<TData, TMeta extends DataProviderMeta> {
  generateVariablesFromParams(params: DataProviderParams): Record<string, any>;
  list(params: DataProviderListParams, meta: TMeta, signal?: AbortSignal): Promise<DataProviderListResponse<TData>>;
  create?(params: DataProviderCreateParams, meta: TMeta): Promise<TData | undefined>;
  update?(params: DataProviderUpdateParams, meta: TMeta): Promise<TData | undefined>;
  delete?(params: DataProviderDeleteParams, meta: TMeta): Promise<TData | undefined>;
}

interface NestjsQueryDataProviderFilter extends DataProviderParamsFilter {
  value: DataProviderParamsFilter | any;
}

export interface NestjsQueryDataProviderMeta extends DataProviderMeta {
  query: DocumentNode;
  operation: string;
  variables?: Record<string, any>;
}

export type NestjsQueryDataProviderFilterParamAdapter = (
  filter: DataProviderParamsFilter,
) => NestjsQueryDataProviderFilter;

export type NestjsQueryDataProviderFilterAdapter = {
  field: string | string[];
  adapter: NestjsQueryDataProviderFilterParamAdapter;
};

export interface NestjsQueryDataProviderOptions {
  filterAdapters?: NestjsQueryDataProviderFilterAdapter[];
}

export type CubejsTimeDimension = TimeDimension;

export interface CubejsDataProviderMeta {
  measures: Query['measures'];
  dimensions?: Query['dimensions'];
  timezone?: Query['timezone'];
}

export type CubejsFilterToTimeDimension = (filter: DataProviderParamsFilter) => CubejsTimeDimension | null;

export type CubejsTimeDimensionFilter = {
  field: string | string[];
  filterToTimeDimension: CubejsFilterToTimeDimension;
};

export interface CubejsDataProviderOptions {
  defaultTimezone?: string;
  timeDimensionFilters?: CubejsTimeDimensionFilter[];
}
