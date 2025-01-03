import type { DataGridFilterOperator } from './filterOperators.types';
import type { DefaultOptionType } from 'antd/es/select';

export type FilterOptionDataType = Record<string, any> | undefined;

export interface FilterOptionType<TData extends FilterOptionDataType = FilterOptionDataType> extends DefaultOptionType {
  data?: TData;
}

export type FetchOptionsFn<TData extends FilterOptionDataType = FilterOptionDataType> = (
  variables?: Record<string, any>,
) => Promise<FilterOptionType<TData>[]>;

export type InfinityFetchOptionsFn<TData extends FilterOptionDataType = FilterOptionDataType> = (
  variables: InfinityFetchOptionsVariables,
  signal?: AbortSignal,
) => Promise<FilterOptionType<TData>[]>;

export type InfinityFetchOptionsVariables = {
  substring?: string;
  defaultValue?: string[];
  page?: number;
  [key: string]: any;
};

export type ToFilterChipsFn = (value: FilterValue, options?: FilterOptionType[]) => DataGridFilterChips[];

export type IsFilterEmptyFn = (value: FilterValue) => boolean;

export type FilterRenderArgs<TData extends FilterOptionDataType = FilterOptionDataType> = {
  defaultValue?: FilterValue;
  value?: FilterValue;
  options?: FilterOptionType<TData>[];
  selectedOptions?: FilterOptionType<TData>[];
  loading?: boolean;
  disabled?: boolean;
  fetchOptions?: FetchOptionsFn<TData>;
  infinityFetchOptions?: InfinityFetchOptionsFn<TData>;
  onChange?: (value: FilterValue) => void;
  updateLoading?: (loading: boolean) => void;
  updateOptions?: (newOptions: FilterOptionType<TData>[]) => void;
  updateSelectedOptions?: (newOptions: FilterOptionType<TData>[]) => void;
};

export type FilterRenderType<TData extends FilterOptionDataType = FilterOptionDataType> = (
  args: FilterRenderArgs<TData>,
) => JSX.Element;

type FilterField = string | string[];

export type BaseFilterConstructorArgs = {
  key: string;
  field: FilterField;
  label?: string;
  component?: JSX.Element;
  operator?: DataGridFilterOperator;
  placeholder?: string;
  width?: string | number;
};

export type FilterValue = any;

export type DataGridFilterChips = {
  key: string;
  field: FilterField;
  label: string;
  data: {
    value: any;
    label: string;
  };
  removeFilter: (key: string, selectedFilters: DataGridFiltersType, value?: FilterValue) => DataGridFiltersType;
};

export type DataGridFilterValue = {
  field: FilterField;
  value: FilterValue;
  operator: DataGridFilterOperator;
};

export type DataGridFiltersType = {
  [filterKey: string]: DataGridFilterValue;
};

export type DataGridFilter = {
  key: string;
  field: FilterField;
  label: string;
  labelIcon?: React.ReactNode;
  value?: FilterValue;
  defaultValue?: FilterValue;
  options?: FilterOptionType[];
  // Provides ability to persist selected options during dynamic filters fetch (e.g. Async Select)
  selectedOptions?: FilterOptionType[];
  width?: string | number;
  showInPanel: boolean;
  showInToolbar: boolean;
  loading?: boolean;
  isFilterEmpty: IsFilterEmptyFn;
  fetchOptions?: FetchOptionsFn;
  infinityFetchOptions?: InfinityFetchOptionsFn;
  operator: DataGridFilterOperator;
  render?: FilterRenderType;
  toFilterChips: ToFilterChipsFn;
  toFilterParams: (value: FilterValue) => Record<string, any>;
  fromFilterParams: (params: Record<string, any>) => FilterValue;
};
