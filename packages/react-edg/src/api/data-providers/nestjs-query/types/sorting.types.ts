export enum NestjsQuerySortDirection {
  descend = 'DESC',
  ascend = 'ASC',
}

export enum NestjsQuerySortNulls {
  First = 'NULLS_FIRST',
  Last = 'NULLS_LAST',
}

export type NestjsQuerySorting = {
  field: string;
  direction: NestjsQuerySortDirection;
};
