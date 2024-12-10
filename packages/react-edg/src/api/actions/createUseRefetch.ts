import { QueryKey, type DataProviderMeta } from '@datagrid/api/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const createUseRefetch =
  <TData, TMeta extends DataProviderMeta>(entityKey: string) =>
  () => {
    const queryClient = useQueryClient();

    return useCallback(() => {
      return queryClient.invalidateQueries([entityKey, QueryKey.List]);
    }, [queryClient]);
  };
