import type { DataGridColumn } from './table.types';
import type { Key } from 'react';

export interface DataGridSorterResult<TData> {
  columns?: DataGridColumn<TData>;
  order?: DataGridSortOrder;
  field?: Key | readonly Key[];
  columnKey?: Key;
}

export type DataGridSorter<TData> = DataGridSorterResult<TData> | DataGridSorterResult<TData>[];

export type DataGridSortOrder = 'descend' | 'ascend' | null;
