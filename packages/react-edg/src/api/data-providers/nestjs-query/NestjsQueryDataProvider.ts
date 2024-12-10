import { type ApolloClient } from '@apollo/client';

import { extractDataFromEdges, generateFilters, generatePagination, generateSorting } from './helpers';

import type { EdgesWithNodesData } from './helpers';
import type {
  DataProvider,
  DataProviderListParams,
  NestjsQueryDataProviderMeta,
  NestjsQueryDataProviderOptions,
} from '@datagrid/api/types';

export const NestjsQueryDataProvider = <TData>(
  client: ApolloClient<object>,
  options?: NestjsQueryDataProviderOptions,
): DataProvider<TData, NestjsQueryDataProviderMeta> => {
  const generateVariablesFromParams = (params: DataProviderListParams) => ({
    paging: generatePagination(params.paging),
    sorting: generateSorting(params.sorting),
    filter: generateFilters(params.filters, options?.filterAdapters),
  });

  return {
    generateVariablesFromParams,

    list: async (params, meta, signal) => {
      const { query, operation, variables } = meta;

      const { data } = await client.query<Record<string, EdgesWithNodesData<TData>>>({
        query,
        variables: {
          ...generateVariablesFromParams(params),
          ...variables,
        },
        fetchPolicy: 'no-cache',
        context: {
          fetchOptions: {
            signal,
          },
        },
      });
      const extractedData = extractDataFromEdges<TData>(data[operation]);

      return {
        data: extractedData.data,
        totalCount: extractedData.totalCount ?? 0,
      };
    },

    create: async (params, meta) => {
      const { query, operation } = meta;

      const { data } = await client.mutate<Record<string, TData>>({
        mutation: query,
        variables: params.variables,
      });

      return data?.[operation];
    },

    update: async (params, meta) => {
      const { query, operation } = meta;

      const { data } = await client.mutate<Record<string, TData>>({
        mutation: query,
        variables: params.variables,
      });

      return data?.[operation];
    },

    delete: async (params, meta) => {
      const { query, operation } = meta;

      const { data } = await client.mutate<Record<string, TData>>({
        mutation: query,
        variables: params.variables,
      });

      return data?.[operation];
    },
  };
};
