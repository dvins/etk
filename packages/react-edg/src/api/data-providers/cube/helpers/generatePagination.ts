import type { DataProviderParams } from '@datagrid/api/types';

export function generatePagination({ pageSize = 10, current }: DataProviderParams['paging']) {
  return {
    offset: pageSize * (current! - 1),
    limit: pageSize,
    total: true,
  };
}
