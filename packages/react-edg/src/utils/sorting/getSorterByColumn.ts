import type { DataGridColumn, DataGridSorterResult, TableData } from '@datagrid/types';

export const getSorterByColumn = <TData extends TableData>(column: DataGridColumn<TData>): DataGridSorterResult<TData> => {
  return {
    columnKey: column.key,
    field: column.dataIndex,
    order: column.defaultSortOrder,
  };
};
