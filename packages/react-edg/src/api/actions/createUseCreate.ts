import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  QueryKey,
  type DataProvider,
  type DataProviderCreateParams,
  type DataProviderMeta,
  type DataProviderMutationMeta,
} from '../types';

export const createUseCreate =
  <TData, TMeta extends DataProviderMeta>(dataProvider: DataProvider<TData, TMeta>, entityKey: string) =>
  (meta: TMeta & DataProviderMutationMeta<TData>) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (parameters: DataProviderCreateParams) =>
        dataProvider.create?.(parameters, meta) ??
        Promise.reject(new Error('The create method is not implemented in the provided DataProvider')),
      onSuccess: (data) => {
        queryClient.invalidateQueries([entityKey, QueryKey.List]);
        meta.onSuccess?.(data);
      },
      onError: (error) => meta.onError?.(error),
      onSettled: (data, error) => meta.onSettled?.(data, error),
    });
  };
