import type { DataGridSorterResult } from '@datagrid/types';

export const transformSortValueToQueryParams = <TData>(sorter: DataGridSorterResult<TData>[]): string[] => {
  return sorter.reduce<string[]>((sorting, { columnKey, order }) => {
    if (!order) {
      return sorting;
    }

    return [...sorting, `${columnKey}+${order}`];
  }, []);
};
