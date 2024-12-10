import {
  QueryKey,
  type DataProvider,
  type DataProviderListParams,
  type DataProviderListResponse,
  type DataProviderMeta,
} from '@datagrid/api/types';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export const createUseList =
  <TData, TMeta extends DataProviderMeta>(dataProvider: DataProvider<TData, TMeta>, entityKey: string) =>
  (meta: TMeta) => {
    const initialResponse = {
      data: [],
      totalCount: 0,
    };

    const [parameters, setParameters] = useState<DataProviderListParams>();
    const [prevResponse, setPrevResponse] = useState<DataProviderListResponse<TData>>(initialResponse);

    const fetchList = async (parameters?: DataProviderListParams, signal?: AbortSignal) => {
      if (!parameters) {
        return initialResponse;
      }

      try {
        const result = await dataProvider.list(parameters, meta, signal);
        setPrevResponse(result);
        return result;
      } catch (error) {
        setPrevResponse(initialResponse);
        return initialResponse;
      }
    };

    const { data, error, isFetching, refetch } = useQuery({
      queryKey: [entityKey, QueryKey.List, parameters, meta.variables],
      queryFn: ({ signal }) => fetchList(parameters, signal),
      enabled: Boolean(parameters),
      refetchOnWindowFocus: false,
      placeholderData: prevResponse,
    });

    // Update parameters to trigger refetch
    const updateParameters = (newParameters: DataProviderListParams) => {
      setParameters(newParameters);
    };

    return {
      data: data ?? initialResponse,
      error,
      isLoading: isFetching,
      fetch: updateParameters,
      refetch,
    };
  };
