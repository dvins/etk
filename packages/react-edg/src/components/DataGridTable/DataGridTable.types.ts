import type { DataGridProps } from '../DataGrid/DataGrid.types';
import type { DataGridColumn, DataGridPaginationConfig, DataGridSorter, FilterValue, TableData } from '@datagrid/types';
import type { TableProps } from 'antd';
import type { TableCurrentDataSource } from 'antd/es/table/interface';

export type DataGridTableProps<TData extends TableData> = Omit<TableProps<TData>, 'onChange'> &
  Pick<DataGridProps<TData>, 'onRowClick' | 'contextMenu'> & {
    columns: DataGridColumn<TData>[];
  } & {
    loading?: boolean;
    loadingMessage?: string;
    onChange?: (
      pagination: DataGridPaginationConfig,
      filters: Record<string, FilterValue>,
      sorter: DataGridSorter<TData>,
      extra: TableCurrentDataSource<TData>,
    ) => void;
  };
