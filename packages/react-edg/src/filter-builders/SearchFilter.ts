import { Search } from '@datagrid/components/filters';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Tooltip } from 'antd';
import { createElement } from 'react';

import { BaseFilter } from './BaseFilter';

import type { BaseFilterConstructorArgs } from '@datagrid/types';

interface SearchFilterConstructorArgs extends BaseFilterConstructorArgs {
  description?: string;
  minSearchLength?: number;
}

/**
 * Represents a SearchFilter class builder.
 */
export class SearchFilter extends BaseFilter {
  /**
   * The column keys associated with the search query request.
   */
  protected queryKeys?: string[];

  /**
   * Minimum length to trigger the search.
   */
  protected minSearchLength?: number;

  private description?: string;

  constructor(filterArgs?: SearchFilterConstructorArgs) {
    super(filterArgs ?? {});

    this.operator = filterArgs?.operator ?? 'contains';
    this.label = filterArgs?.label ?? 'Search By';
    this.description = filterArgs?.description;
    this.minSearchLength = filterArgs?.minSearchLength;
    this.placeholder = filterArgs?.placeholder;

    if (this.description) {
      this.setLabelIcon();
    }

    this.useShowInFiltersPanel(false);
    this.useShowInFiltersToolbar(true);
  }

  private setLabelIcon(): void {
    const iconElement = createElement(FontAwesomeIcon, { icon: faInfoCircle });
    const tooltipElement = createElement(Tooltip, { title: this.description }, iconElement);
    this.useLabelIcon(tooltipElement);
  }

  /**
   * Configures the SearchFilter to use a Search component for rendering. Applies the LIKE comparison method.
   * @returns The current instance of the SearchFilter.
   */
  useSearchInput(): this {
    this.useRender(({ onChange, defaultValue, value, disabled }) =>
      createElement(Search, {
        defaultValue,
        value,
        onChange,
        disabled,
        placeholder: this.placeholder,
        minSearchLength: this.minSearchLength,
      }),
    );

    return this;
  }
}
