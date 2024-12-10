import { QueryKey, type DataProvider, type DataProviderDeleteParams, type DataProviderMeta } from '@datagrid/api/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { DataProviderMutationMeta } from '@datagrid/api/types';

export const createUseDelete =
  <TData, TMeta extends DataProviderMeta>(dataProvider: DataProvider<TData, TMeta>, entityKey: string) =>
  (meta: TMeta & DataProviderMutationMeta<TData>) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (params: DataProviderDeleteParams) =>
        dataProvider.delete?.(params, meta) ??
        Promise.reject(new Error('The delete method is not implemented in the provided DataProvider')),
      onSuccess: (data) => {
        queryClient.invalidateQueries([entityKey, QueryKey.List]);
        meta.onSuccess?.(data);
      },
      onError: (error) => meta.onError?.(error),
      onSettled: (data, error) => meta.onSettled?.(data, error),
    });
  };
