import queryString from 'query-string';

import type { StringifyOptions } from 'query-string';

export function stringifyQueryParams(queryParams: Record<string, any>, stringifyOptions: StringifyOptions): string {
  return queryString.stringify(queryParams, stringifyOptions);
}
