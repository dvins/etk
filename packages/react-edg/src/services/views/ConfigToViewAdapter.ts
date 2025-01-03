import type {
  DataGridColumn,
  DataGridFilter,
  DataGridFiltersType,
  DataGridView,
  DataGridSorterResult,
  TableData,
  ViewConfig,
} from '@datagrid/types';

export class ConfigToViewAdapter<TData extends TableData> {
  private viewConfig: ViewConfig;

  constructor(viewConfig: ViewConfig) {
    this.viewConfig = viewConfig;
  }

  private getPinnedFilters(): string[] {
    const {
      value: { filters },
    } = this.viewConfig;

    return filters.reduce<string[]>((filterKeys, filterConfig) => {
      if (filterConfig.pinned) {
        return [...filterKeys, filterConfig.key];
      }

      return filterKeys;
    }, []);
  }

  private getViewColumns(columnsMap: Record<string, DataGridColumn<TData>>): DataGridColumn<TData>[] {
    const {
      value: { columns },
    } = this.viewConfig;

    return columns.map<DataGridColumn<TData>>((columnConfig) => {
      const column = columnsMap[columnConfig.key];

      return {
        ...column,
        defaultSortOrder: columnConfig.sortOrder ?? null,

        fixed: columnConfig.pinned,
        hidden: !columnConfig.visible,
      };
    });
  }

  private getViewSorting(columnsMap: Record<string, DataGridColumn<TData>>): DataGridSorterResult<TData>[] {
    const {
      value: { columns },
    } = this.viewConfig;

    return columns.reduce<DataGridSorterResult<TData>[]>((sorting, column) => {
      if (!column.sortOrder) {
        return sorting;
      }

      const { field, dataIndex, key } = columnsMap[column.key];

      return [
        ...sorting,
        {
          columnKey: key,
          field: field ?? dataIndex ?? key,
          order: column.sortOrder,
        },
      ];
    }, []);
  }

  private getViewFilters(filtersMap: Record<string, DataGridFilter>): DataGridFiltersType {
    const {
      value: { filters },
    } = this.viewConfig;

    return filters.reduce<DataGridFiltersType>((viewFilters, filterConfig) => {
      if (!filterConfig.value) {
        return viewFilters;
      }

      return {
        ...viewFilters,
        [filterConfig.key]: {
          field: filtersMap[filterConfig.key].field,
          value: filterConfig.value,
          operator: filtersMap[filterConfig.key].operator,
        },
      };
    }, {});
  }

  toDataGridView(
    columnsMap: Record<string, DataGridColumn<TData>>,
    filtersMap: Record<string, DataGridFilter>,
  ): DataGridView<TData> {
    const { key } = this.viewConfig;

    return {
      key,
      columns: this.getViewColumns(columnsMap),
      selectedFilters: this.getViewFilters(filtersMap),
      pinnedFilters: this.getPinnedFilters(),
      sorting: this.getViewSorting(columnsMap),
    };
  }
}
