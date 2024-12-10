import type { TablePaginationConfig as AntdTablePaginationConfig } from 'antd';

export type DataGridPaging = {
  first: number;
  after?: string;
};

export type DataGridPaginationConfig = AntdTablePaginationConfig;
