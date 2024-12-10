import {
  DataGridCardGrid,
  DataGridFiltersChips,
  DataGridFiltersPanel,
  DataGridFiltersToolbar,
  DataGridTable,
  DataGridToolbar,
} from '@datagrid/components';
import { defaultToolbarConfig, DEFAULT_PAGE_SIZE, FILTERS_PANEL } from '@datagrid/constants';
import { useErrorHandling } from '@datagrid/hooks/base';
import { useDataGridColumns } from '@datagrid/hooks/columns';
import { useDataGridFilters } from '@datagrid/hooks/filters';
import { usePagination } from '@datagrid/hooks/pagination';
import { useDataGridQueryParams, useUpdateQueryParams } from '@datagrid/hooks/query-params';
import { useSelectableRows } from '@datagrid/hooks/selection';
import { useDataGridSorting } from '@datagrid/hooks/sorting';
import { useTableKey } from '@datagrid/hooks/table';
import { useDataGridTheme } from '@datagrid/theme/hooks';
import { ViewMode } from '@datagrid/types';
import { transformToParameters } from '@datagrid/utils/parameters';
import { getToolbarConfig } from '@datagrid/utils/toolbar';
import { useDebounceEffect } from 'ahooks';
import { isEmpty } from 'lodash';
import { useMemo, useState } from 'react';
import { ThemeProvider } from 'styled-components';

import { DataGridDevError } from '../DataGridDevError';
import { DataGridHeader } from '../DataGridHeader';

import { Styled } from './DataGrid.styles';

import type { DataGridProps } from './DataGrid.types';
import type {
  DataGridSorter,
  TableData,
  DataGridView,
  DataGridPaginationConfig,
  DataGridParameters,
} from '@datagrid/types';

export function DataGrid<TData extends TableData>({
  rowKey,
  title,
  columnBuilders,
  data,
  loading,
  loadingError,
  contextMenu,
  toolbarConfig = defaultToolbarConfig,
  CardItem,
  views: viewsConfig,
  actionButton,
  bulkActions,
  onRowClick,
  onParamsChange,
  onDataExport,
  ...tableProps
}: DataGridProps<TData>): JSX.Element | null {
  const theme = useDataGridTheme();
  const { tableKey, setTableKey } = useTableKey(tableProps.key);
  const {
    initialSortQueryParams,
    initialPageQueryParams,
    initialFiltersQueryParams,
    initialViewQueryParams,
    setSortingQueryParams,
    setPagingQueryParams,
    setFiltersQueryParams,
    setViewQueryParams,
  } = useDataGridQueryParams();
  const { columns, defaultColumns, visibleColumns, columnToFieldMap, setColumns } = useDataGridColumns<TData>({
    columnBuilders,
    initialSortQueryParams,
  });
  const {
    filtersInitialized,
    filtersFetched,
    defaultFilters,
    selectedFilters,
    updatePinnedFilters,
    updateSelectedFilters,
  } = useDataGridFilters<TData>(columns, initialFiltersQueryParams);
  const { rowSelection, renderSelectableActions } = useSelectableRows(bulkActions);
  const [selectedView, setSelectedView] = useState<DataGridView<TData>>();

  const [paging, setPaging] = useState<DataGridPaginationConfig>({
    pageSize: DEFAULT_PAGE_SIZE,
    current: initialPageQueryParams,
  });
  const { sorting, querySorting, defaultSorting, setSorting } = useDataGridSorting({
    columnBuilders,
    initialQueryParams: initialSortQueryParams,
  });

  const dataGridParameters = useMemo<DataGridParameters>(
    () =>
      transformToParameters({
        filters: selectedFilters,
        sorting,
        paging,
        columnToFieldMap,
      }),
    [selectedFilters, sorting, paging, columnToFieldMap],
  );

  // Update query params based on filters, sorting, paging and view
  useUpdateQueryParams<TData>({
    defaultSorting,
    paging,
    selectedView,
    sorting,
    setQueryParams: {
      filters: setFiltersQueryParams,
      sorting: setSortingQueryParams,
      paging: setPagingQueryParams,
      view: setViewQueryParams,
    },
  });

  // Handle error from data fetching
  useErrorHandling(loadingError);

  // Fire changed parameters with debounce to avoid multiple requests
  useDebounceEffect(
    () => {
      onParamsChange?.(dataGridParameters);
    },
    [dataGridParameters],
    {
      wait: 100,
    },
  );

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.List);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const pagination = usePagination({ total: data.totalCount, paging, initialPageQueryParams });

  const panelSize = filtersPanelOpen ? FILTERS_PANEL.width : 0;

  const jumpToFirstPage = () => {
    setPaging((prevState) => ({
      ...prevState,
      current: 1,
    }));
  };

  const handleOnChange = (pagination: DataGridPaginationConfig, _?: any, sorter?: DataGridSorter<TData>) => {
    setPaging(pagination);

    if (!isEmpty(sorter)) {
      setSorting(sorter, jumpToFirstPage);
    }
  };

  const handleViewModeChange = (selectedViewMode: ViewMode) => {
    setViewMode(selectedViewMode);
  };

  const handleDataExport = () => onDataExport?.(dataGridParameters);

  const updateDataGridOnViewChange = (view: DataGridView<TData>) => {
    setColumns(view.columns);
    updateSelectedFilters(view.selectedFilters);
    setSorting(view.sorting);
    updatePinnedFilters(view.pinnedFilters);
    setTableKey(view.key);
    jumpToFirstPage();
  };

  const handleViewChange = (view: DataGridView<TData>, initialView?: DataGridView<TData>) => {
    setSelectedView(view);
    updateDataGridOnViewChange(initialView ?? view);
  };

  const resetToDefault = () => {
    updateSelectedFilters(defaultFilters);
    setSorting(defaultSorting);
    setColumns(defaultColumns);
    setTableKey(tableKey);
    jumpToFirstPage();
  };

  return (
    <ThemeProvider theme={theme}>
      <Styled.Container>
        <Styled.Content panelSize={panelSize}>
          <Styled.Space size="small">
            {filtersInitialized && (
              <Styled.Space size={12}>
                <DataGridHeader
                  title={title}
                  viewsConfig={viewsConfig}
                  selectedView={selectedView}
                  defaultViewKey={initialViewQueryParams}
                  columns={columns}
                  querySorting={querySorting}
                  onViewChange={handleViewChange}
                  onViewInit={handleViewChange}
                  resetToDefault={resetToDefault}
                />

                <DataGridFiltersToolbar onSelectedFiltersChange={jumpToFirstPage} />

                {Object.keys(selectedFilters).length && filtersFetched ? (
                  <DataGridFiltersChips onSelectedFiltersChange={jumpToFirstPage} />
                ) : null}

                <DataGridDevError />

                <DataGridToolbar
                  viewMode={viewMode}
                  toolbarConfig={getToolbarConfig(toolbarConfig, Boolean(CardItem))}
                  columns={columns}
                  defaultColumns={selectedView?.columns ?? defaultColumns}
                  filtersPanelOpen={filtersPanelOpen}
                  actionButton={actionButton}
                  isExportable={Boolean(onDataExport)}
                  onColumnsManagerSave={setColumns}
                  onViewModeChange={handleViewModeChange}
                  onDataExport={handleDataExport}
                  onFiltersPanelOpen={setFiltersPanelOpen}
                  renderSelectableActions={renderSelectableActions}
                />
              </Styled.Space>
            )}

            {viewMode === ViewMode.Card && CardItem ? (
              <Styled.CardGridWrapper>
                <DataGridCardGrid<TData>
                  rowKey={rowKey}
                  rowSelection={rowSelection}
                  dataSource={data.data}
                  loading={loading}
                  CardItem={CardItem}
                  pagination={pagination}
                  contextMenu={contextMenu}
                  onChange={handleOnChange}
                  onCardClick={onRowClick}
                />
              </Styled.CardGridWrapper>
            ) : (
              <DataGridTable<TData>
                key={tableKey}
                size="small"
                sortDirections={['descend', 'ascend']}
                rowKey={rowKey}
                rowSelection={rowSelection}
                columns={visibleColumns}
                contextMenu={contextMenu}
                dataSource={data.data}
                loading={loading}
                onChange={handleOnChange}
                pagination={pagination}
                onRowClick={onRowClick}
                {...tableProps}
              />
            )}
          </Styled.Space>
        </Styled.Content>
        <Styled.RightPanel width={panelSize}>
          {filtersInitialized && (
            <DataGridFiltersPanel
              open={filtersPanelOpen}
              onSelectedFiltersChange={jumpToFirstPage}
              onClose={() => setFiltersPanelOpen(false)}
            />
          )}
        </Styled.RightPanel>
      </Styled.Container>
    </ThemeProvider>
  );
}
