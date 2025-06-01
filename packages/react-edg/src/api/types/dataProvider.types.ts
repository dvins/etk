import type { Query, TimeDimension } from '@cubejs-client/core';
import type { EdgesWithNodesData } from '@datagrid/api';
import type { DataGridError, DataGridParameters, DataGridParametersFilter } from '@datagrid/types';
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
  loadingMessage?: string;
  generateVariablesFromParams(params: DataProviderParams): Record<string, any>;
  list(params: DataProviderListParams, meta: TMeta, signal?: AbortSignal): Promise<DataProviderListResponse<TData>>;
  errorTransformer(error: unknown): DataGridError;
  create?(params: DataProviderCreateParams, meta: TMeta): Promise<TData | undefined>;
  update?(params: DataProviderUpdateParams, meta: TMeta): Promise<TData | undefined>;
  delete?(params: DataProviderDeleteParams, meta: TMeta): Promise<TData | undefined>;
}

interface NestjsQueryDataProviderFilter extends DataProviderParamsFilter {
  value: DataProviderParamsFilter | any;
}

export interface NestjsQueryDataProviderMeta<TData> extends DataProviderMeta {
  operation: string;
  createFetcher?: CreateFetcher<TData>;
  mutation?: Mutation;
  query?: DocumentNode;
  variables?: Record<string, any>;
}

type CreateFetcher<TData> = (
  signal?: AbortSignal,
) => (variables: Record<string, any>) => Promise<Record<string, EdgesWithNodesData<TData>>>;
type Mutation<TData = unknown, TVars = any> = (variables: TVars) => Promise<TData>;

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

export type CubeTimeDimension = TimeDimension;

/**
 * Interface representing the metadata for a Cube.js data provider.
 *
 * @property measures - An array of measures to be queried.
 * @property dimensions - An optional array of dimensions to be queried.
 * @property filters - Optional filters that will be combined with the filters from the Data Grid parameters.
 * @property timezone - An optional timezone string to be used for the query.
 */
export interface CubeDataProviderMeta {
  measures: Query['measures'];
  dimensions?: Query['dimensions'];
  filters?: Query['filters'];
  timezone?: Query['timezone'];
}

export type CubeFilterToTimeDimension = (filter: DataProviderParamsFilter) => CubeTimeDimension | null;

export type CubeTimeDimensionFilter = {
  field: string | string[];
  filterToTimeDimension: CubeFilterToTimeDimension;
};

export interface CubeDataProviderOptions {
  defaultTimezone?: string;
  timeDimensionFilters?: CubeTimeDimensionFilter[];
}
