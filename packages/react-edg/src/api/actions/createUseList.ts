import {
  QueryKey,
  type DataProvider,
  type DataProviderListParams,
  type DataProviderMeta,
  type DataProviderListResponse,
} from '@datagrid/api/types';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

export const createUseList =
  <TData, TMeta extends DataProviderMeta>(dataProvider: DataProvider<TData, TMeta>, entityKey: string) =>
  (meta: TMeta) => {
    const initialData: DataProviderListResponse<TData> = {
      data: [],
      totalCount: 0,
    };

    const [parameters, setParameters] = useState<DataProviderListParams>();
    const [prevResponse, setPrevResponse] = useState<DataProviderListResponse<TData>>(initialData);
    const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false);

    const fetchList = async (params?: DataProviderListParams, signal?: AbortSignal) => {
      if (!params) {
        return prevResponse;
      }

      /**
       * Display a loading message if the fetch operation takes longer than 3 seconds
       */
      const loadingMessageTimer = setTimeout(() => {
        setShowLoadingMessage(true);
      }, 3000);

      try {
        const result = await dataProvider.list(params, meta, signal);

        setPrevResponse(result);
        return result;
      } catch (error) {
        setPrevResponse(initialData);
        return initialData;
      } finally {
        clearTimeout(loadingMessageTimer);
        setShowLoadingMessage(false);
      }
    };

    const {
      data: response,
      error,
      isFetching,
      refetch,
    } = useQuery({
      queryKey: [entityKey, QueryKey.List, parameters, meta.variables],
      queryFn: ({ signal }) => fetchList(parameters, signal),
      enabled: Boolean(parameters),
      refetchOnWindowFocus: false,
      placeholderData: prevResponse,
    });

    const updateParameters = useCallback((newParameters: DataProviderListParams) => {
      setParameters(newParameters);
    }, []);

    return {
      data: response ?? initialData,
      error,
      isLoading: isFetching,
      loadingMessage: showLoadingMessage ? dataProvider.loadingMessage : undefined,
      fetch: updateParameters,
      refetch,
    };
  };
