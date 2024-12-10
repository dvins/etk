import { Select } from 'antd';
import { createElement } from 'react';

import { BaseFilter } from './BaseFilter';

import type { BaseFilterConstructorArgs } from '@datagrid/types';
import type { SelectProps } from 'antd';

/**
 * Represents an Options Filter builder.
 */
export class OptionsFilter extends BaseFilter {
  constructor(args: BaseFilterConstructorArgs) {
    super(args);
    this.operator = args.operator ?? 'in';
  }

  /**
   * Configures the filter to use a Select as component render. Uses IN comparison method and passes the options to useOptions.
   * @param props Optional props to be passed to the Select component.
   * @returns The current instance of the OptionsFilter.
   */
  useSelect(props?: SelectProps): this {
    this.useRender(({ onChange, value, defaultValue, disabled }) =>
      createElement(Select, {
        allowClear: true,
        defaultValue,
        value,
        onChange,
        placeholder: 'Select',
        disabled,
        ...props,
      }),
    );

    if (props?.options?.length) {
      this.useOptions(props.options);
    }

    return this;
  }
}
