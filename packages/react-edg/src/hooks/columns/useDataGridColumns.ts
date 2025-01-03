import { getColumnsFromColumnBuilders } from '@datagrid/utils/column-builders';
import { getColumnsWithQuerySorting } from '@datagrid/utils/columns';
import { cloneDeep } from 'lodash';
import { useMemo, useState } from 'react';

import type { BaseColumn } from '@datagrid/column-builders';
import type { DataGridColumn, TableData } from '@datagrid/types';

type UseDataGridColumnsArgs<TData extends TableData> = {
  columnBuilders: BaseColumn<TData>[];
  initialSortQueryParams: string[];
};

type UseDataGridColumnsReturn<TData extends TableData> = {
  columns: DataGridColumn<TData>[];
  defaultColumns: DataGridColumn<TData>[];
  visibleColumns: DataGridColumn<TData>[];
  columnToFieldMap: Record<string, string>;
  setColumns: (value: DataGridColumn<TData>[]) => void;
};

export const useDataGridColumns = <TData extends TableData>({
  columnBuilders,
  initialSortQueryParams,
}: UseDataGridColumnsArgs<TData>): UseDataGridColumnsReturn<TData> => {
  const defaultColumns: DataGridColumn<TData>[] = useMemo(
    () => getColumnsFromColumnBuilders(cloneDeep(columnBuilders)),
    [columnBuilders],
  );

  const columnsWithInitialSorting: DataGridColumn<TData>[] = useMemo(() => {
    if (!initialSortQueryParams.length) {
      return [...defaultColumns];
    }

    return getColumnsWithQuerySorting(initialSortQueryParams, cloneDeep(columnBuilders));
  }, [initialSortQueryParams, columnBuilders]);

  const [columns, setColumns] = useState<DataGridColumn<TData>[]>(columnsWithInitialSorting);

  const visibleColumns = useMemo(() => columns.filter((column) => !column.hidden), [columns]);

  const columnToFieldMap = useMemo(() => {
    return columnBuilders.reduce((fieldsMap, builder) => {
      const column = builder.getColumn();
      const columnField = column.field ?? column.dataIndex;

      return {
        ...fieldsMap,
        [column.key]: columnField,
      };
    }, {});
  }, [columnBuilders]);

  return {
    columns,
    defaultColumns,
    setColumns,
    visibleColumns,
    columnToFieldMap,
  };
};
