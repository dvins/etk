import { fieldToString, generateFilters, generatePagination, generateSorting, generateTimeDimensions } from './helpers';

import type { CubejsApi, Query } from '@cubejs-client/core';
import type {
  CubejsDataProviderMeta,
  CubejsDataProviderOptions,
  DataProvider,
  DataProviderListParams,
} from '@datagrid/api/types';

export const CubejsDataProvider = <TData>(
  cubejsApi: CubejsApi,
  options?: CubejsDataProviderOptions,
): DataProvider<TData, CubejsDataProviderMeta> => {
  const generateVariablesFromParams = (params: DataProviderListParams) => {
    const timeDimensionFields = options?.timeDimensionFilters?.map((filter) => fieldToString(filter.field));

    return {
      ...generatePagination(params.paging),
      order: generateSorting(params.sorting),
      filters: generateFilters(params.filters, timeDimensionFields),
      timeDimensions: generateTimeDimensions(params.filters, options?.timeDimensionFilters),
    };
  };

  return {
    generateVariablesFromParams,

    list: async (params, meta) => {
      const query: Query = {
        timezone: options?.defaultTimezone,
        ...meta,
        ...generateVariablesFromParams(params),
      };

      const result = await cubejsApi.load(query);
      const data = result.rawData();
      const totalCount = result.serialize().loadResponse.results[0].total ?? data.length;

      return {
        data,
        totalCount,
      };
    },
  };
};
