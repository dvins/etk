import { isArray } from 'lodash';

import type {
  DataGridFiltersType,
  DataGridPaginationConfig,
  DataGridParameters,
  DataGridSorter,
} from '@datagrid/types';

export const transformToParameters = <TData>(args: {
  filters: DataGridFiltersType;
  sorting: DataGridSorter<TData>;
  paging: DataGridPaginationConfig;
  columnToFieldMap: Record<
    string,
    {
      filterField: string | string[];
      sortField: string | string[];
    }
  >;
}): DataGridParameters => {
  const { filters, sorting, paging } = args;
  return {
    filters: Object.entries(filters).map(([columnKey, { value, operator }]) => ({
      field: args.columnToFieldMap[columnKey]?.filterField,
      value,
      operator,
    })),

    sorting: (isArray(sorting) ? sorting : [sorting]).map(({ columnKey, order }) => ({
      field: columnKey ? args.columnToFieldMap[columnKey]?.sortField : undefined,
      order,
    })),

    paging: {
      current: paging.current,
      pageSize: paging.pageSize,
    },
  };
};
