import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type DataProvider,
  type DataProviderUpdateParams,
  type DataProviderMeta,
  type DataProviderMutationMeta,
  QueryKey,
} from '../types';

export const createUseUpdate =
  <TData, TMeta extends DataProviderMeta>(dataProvider: DataProvider<TData, TMeta>, entityKey: string) =>
  (meta: TMeta & DataProviderMutationMeta<TData>) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (params: DataProviderUpdateParams) =>
        dataProvider.update?.(params, meta) ??
        Promise.reject(new Error('The update method is not implemented in the provided DataProvider')),
      onSuccess: (data) => {
        queryClient.invalidateQueries([entityKey, QueryKey.List]);
        meta.onSuccess?.(data);
      },
      onError: (error) => meta?.onError?.(error),
      onSettled: (data, error) => meta?.onSettled?.(data, error),
    });
  };
