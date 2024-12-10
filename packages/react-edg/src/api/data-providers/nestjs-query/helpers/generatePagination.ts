import { Buffer } from 'buffer';

import type { NestjsQueryPaging } from '../types';
import type { DataProviderParams } from '@datagrid/api/types';

export function generatePagination({ pageSize = 10, current }: DataProviderParams['paging']): NestjsQueryPaging {
  return {
    first: pageSize,
    // do not send after parameter on first page
    ...(current !== 1
      ? { after: Buffer.from(`arrayconnection:${pageSize * (current! - 1) - 1}`).toString('base64') }
      : {}),
  };
}
