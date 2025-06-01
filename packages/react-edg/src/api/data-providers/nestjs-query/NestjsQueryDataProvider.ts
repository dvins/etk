import { extractDataFromEdges, generateFilters, generatePagination, generateSorting } from './helpers';

import type { NestjsQueryDataError } from './types';
import type {
  DataProvider,
  DataProviderListParams,
  NestjsQueryDataProviderMeta,
  NestjsQueryDataProviderOptions,
} from '@datagrid/api/types';

export const NestjsQueryDataProvider = <TData>(
  options?: NestjsQueryDataProviderOptions,
): DataProvider<TData, NestjsQueryDataProviderMeta<TData>> => {
  const generateVariablesFromParams = (params: DataProviderListParams) => ({
    paging: generatePagination(params.paging),
    sorting: generateSorting(params.sorting),
    filter: generateFilters(params.filters, options?.filterAdapters),
  });

  return {
    generateVariablesFromParams,

    list: async (params, meta, signal) => {
      const { operation, variables, createFetcher } = meta;
      const parsedVariables = {
        ...generateVariablesFromParams(params),
        ...variables,
      };

      if (!createFetcher) {
        throw new Error('Error: `createFetcher` is not defined.');
      }

      const data = await createFetcher(signal)(parsedVariables);
      const extractedData = extractDataFromEdges(data[operation]);

      return {
        data: extractedData.data,
        totalCount: extractedData.totalCount ?? 0,
      };
    },

    create: async (params, meta) => {
      const { operation, mutation } = meta;
      if (!mutation) {
        throw new Error('Error: `mutation` not defined.');
      }

      const data = await mutation(params.variables);
      return (data as Record<string, any>)?.[operation];
    },

    update: async (params, meta) => {
      const { operation, mutation } = meta;
      if (!mutation) {
        throw new Error('Error: `mutation` not defined.');
      }

      const data = await mutation(params.variables);
      return (data as Record<string, any>)?.[operation];
    },

    delete: async (params, meta) => {
      const { operation, mutation } = meta;
      if (!mutation) {
        throw new Error('Error: `mutation` not defined.');
      }

      const data = await mutation(params.variables);
      return (data as Record<string, any>)?.[operation];
    },

    errorTransformer: (error: NestjsQueryDataError) => {
      if (!error) {
        return error;
      }

      if ('errors' in error) {
        return error.errors.map(({ message }) => new Error(message));
      }

      const errors: Error[] = JSON.parse(error.message);
      return errors;
    },
  };
};
