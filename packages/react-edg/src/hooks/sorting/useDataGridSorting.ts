import { getColumnsFromColumnBuilders } from '@datagrid/utils/column-builders';
import { transformSortValueFromQueryParams } from '@datagrid/utils/query-params/transformers';
import { getSorterByColumn } from '@datagrid/utils/sorting';
import { isArray, isEmpty, omit, isEqual } from 'lodash';
import { useMemo, useState } from 'react';

import type { BaseColumn } from '@datagrid/column-builders';
import type { DataGridSorterResult, TableData, DataGridSorter } from '@datagrid/types';

type UseDataGridSortingArgs<TData extends TableData> = {
  columnBuilders: BaseColumn<TData>[];
  initialQueryParams: string[];
};

type UseDataGridSortingReturn<TData extends TableData> = {
  sorting: DataGridSorterResult<TData>[];
  defaultSorting: DataGridSorterResult<TData>[];
  querySorting: DataGridSorterResult<TData>[];
  setSorting: (sorting: DataGridSorter<TData>, onSortingUpdated?: () => void) => void;
};

export const useDataGridSorting = <TData extends TableData>({
  columnBuilders,
  initialQueryParams,
}: UseDataGridSortingArgs<TData>): UseDataGridSortingReturn<TData> => {
  const querySorting = useMemo(() => {
    const columns = getColumnsFromColumnBuilders(columnBuilders);
    return transformSortValueFromQueryParams<TData>(columns, initialQueryParams);
  }, [initialQueryParams]);

  const defaultSorting = useMemo(
    () =>
      columnBuilders.reduce<DataGridSorterResult<TData>[]>((sorter, columnBuilder) => {
        const column = columnBuilder.getColumn();

        if (!column.defaultSortOrder) {
          return sorter;
        }

        return [...sorter, getSorterByColumn(column)];
      }, []),
    [],
  );

  const [sorting, setSorting] = useState<DataGridSorterResult<TData>[]>(isEmpty(querySorting) ? defaultSorting : querySorting);

  const updateSorting = (newSorting: DataGridSorter<TData>, onSortingUpdated?: () => void) => {
    const sortingArray = isArray(newSorting) ? newSorting : [newSorting];
    // Avoid storing column object in sorting state, important for correct query params resetting
    const mappedSorting = sortingArray.map((sorter) => omit(sorter, 'column'));

    if (!isEqual(sorting, mappedSorting)) {
      setSorting(mappedSorting);
      onSortingUpdated?.();
    }
  };

  return {
    sorting,
    defaultSorting,
    querySorting,
    setSorting: updateSorting,
  };
};
