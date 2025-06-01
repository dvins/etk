import { PAGE_HEADER_HEIGHT } from '@datagrid/constants';
import { useConfiguredColumns } from '@datagrid/hooks/columns';
import { useSelectMode } from '@datagrid/hooks/selection';
import { useTooltipStyles } from '@datagrid/hooks/styles';
import { Table } from 'antd';

import { Styled } from './DataGridTable.styles';

import type { DataGridTableProps } from './DataGridTable.types';
import type { TableData } from '@datagrid/types';

export const DataGridTable = <TData extends TableData>({
  onRowClick,
  columns,
  contextMenu,
  onChange,
  ...props
}: DataGridTableProps<TData>): JSX.Element => {
  const tooltipProps = useTooltipStyles('Click to sort');
  const { selectModeEnabled } = useSelectMode();
  const configuredColumns = useConfiguredColumns({
    columns,
    contextMenu,
  });

  return (
    <Styled.Wrapper clickable={Boolean(onRowClick)}>
      <Table<TData>
        columns={configuredColumns}
        scroll={{ scrollToFirstRowOnChange: true, x: 'max-content' }}
        sticky={{ offsetHeader: PAGE_HEADER_HEIGHT }}
        onRow={(record) => ({
          onClick: () => !selectModeEnabled && onRowClick?.(record),
        })}
        showSorterTooltip={tooltipProps}
        {...props}
        onChange={(pagination, filters, sorter, extra) => {
          if (onChange) {
            const sorting = Array.isArray(sorter) ? sorter : [sorter];
            const fixedSorter = sorting.map((s) => ({ ...s, columnKey: s.columnKey?.toString() }));
            onChange(pagination, filters, fixedSorter, extra);
          }
        }}
        loading={{
          spinning: props.loading,
          tip: props.loadingMessage,
        }}
      />
    </Styled.Wrapper>
  );
};
