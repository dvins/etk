import type { BaseColumn } from '@datagrid/column-builders';
import type { BaseFilter } from '@datagrid/filter-builders';
import type {
  ContextMenuConfig,
  DataGridBulkActionsConfig,
  DataGridToolbarConfig,
  CardItem,
  TableData,
  ViewConfig,
  ActionButton,
  DataExportHandler,
  DataGridParameters,
  DataGridError,
} from '@datagrid/types';
import type { TableProps } from 'antd';

/**
 * Props for the DataGrid component.
 */
export interface DataGridProps<TData extends TableData>
  extends Omit<TableProps<TData>, 'columns' | 'title' | 'onChange'> {
  /**
   * A unique key for the component.
   */
  key?: React.Key;
  title?: string;
  /**
   * An array of column builders to define the columns of the data grid.
   */
  columnBuilders: BaseColumn<TData>[];
  /**
   * An array of filter builders to define the filters of the data grid.
   */
  filterBuilders?: BaseFilter[];
  /**
   * The data source for the data grid, containing the list of data items to be displayed and total count.
   */
  data: {
    data: TData[];
    totalCount: number;
  };
  /**
   * Specifies whether the data grid is in a loading state.
   */
  loading?: boolean;
  /**
   * The message to display while the data grid is in a loading state.
   */
  loadingMessage?: string;
  /**
   * Error encountered while loading data.
   */
  loadingError?: DataGridError;
  /**
   * Toolbar buttons configuration. On `false`, the toolbar won't display on the _DataGrid_.
   *
   * Config values `showList`, `showCard` and `showColumnsManager` are _true_ as default.
   * So in order to hide them you must explicitly set their value to false.
   */
  toolbarConfig?: DataGridToolbarConfig;
  /**
   * Configuration for the context menu.
   */
  contextMenu?: ContextMenuConfig<TData>;
  /**
   * Card item component to render each row in card view.
   */
  CardItem?: CardItem<TData>;
  /**
   * An array of views to be displayed in the toolbar. Or a single view object to change the `Default View` label.
   */
  views?: ViewConfig[];
  /**
   * Action button to be displayed in the toolbar. Used to add custom actions like modals.
   */
  actionButton?: ActionButton;

  /**
   * Configuration for bulk actions in the toolbar during item selection.
   */
  bulkActions?: DataGridBulkActionsConfig;
  /*
   * Handler to fetch data with the data provider on parameters change.
   */
  onParamsChange: (parameters: DataGridParameters) => void;
  /**
   * Callback function triggered when a row is clicked.
   */
  onRowClick?: (data: TData) => void;
  /**
   * Handler function for exporting data.
   */
  onDataExport?: DataExportHandler;
}
