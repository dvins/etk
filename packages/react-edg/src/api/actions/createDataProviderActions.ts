import { createUseCreate } from './createUseCreate';
import { createUseDelete } from './createUseDelete';
import { createUseList } from './createUseList';
import { createUseRefetch } from './createUseRefetch';
import { createUseUpdate } from './createUseUpdate';

import type { DataProvider, DataProviderMeta } from '../types';

export const createDataProviderActions = <TData, TMeta extends DataProviderMeta>(
  dataProvider: DataProvider<TData, TMeta>,
  entityKey: string,
) => {
  const useList = createUseList(dataProvider, entityKey);
  const useCreate = createUseCreate(dataProvider, entityKey);
  const useUpdate = createUseUpdate(dataProvider, entityKey);
  const useDelete = createUseDelete(dataProvider, entityKey);
  const useRefetch = createUseRefetch(entityKey);

  return { useList, useCreate, useUpdate, useDelete, useRefetch };
};
