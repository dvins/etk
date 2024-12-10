import type { DataGridColumn, DataGridSorterResult, DataGridSortOrder, TableData } from '@datagrid/types';

export const transformSortValueFromQueryParams = <TData extends TableData>(
  columns: DataGridColumn<TData>[],
  sortingRules: string[],
): DataGridSorterResult<TData>[] => {
  return sortingRules.reduce<DataGridSorterResult<TData>[]>((sorter, rule) => {
    const [columnKey, sortOrder] = rule.split('+');
    const field = columns.find((column) => column.key === columnKey)?.dataIndex;

    return [
      ...sorter,
      {
        columnKey,
        field,
        order: sortOrder as DataGridSortOrder,
      },
    ];
  }, []);
};
