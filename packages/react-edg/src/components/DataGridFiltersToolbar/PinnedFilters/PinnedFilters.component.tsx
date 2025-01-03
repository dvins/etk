import { DataGridFilterItem } from '@datagrid/components';
import { useFilters } from '@datagrid/hooks/filters';
import { useSelectMode } from '@datagrid/hooks/selection';
import { getValidFilters } from '@datagrid/utils/filters';
import { Col } from 'antd';
import React from 'react';

import type { PinnedFiltersProps } from './PinnedFilters.types';
import type { DataGridFilterValue } from '@datagrid/types';

export const PinnedFilters: React.FC<PinnedFiltersProps> = ({ onSelectedFiltersChange }) => {
  const { selectModeEnabled } = useSelectMode();
  const { filtersMap, selectedFilters, pinnedFilters, updateSelectedFilters } = useFilters();

  const handleFilterChange = (filterKey: React.Key, value: DataGridFilterValue) => {
    const validFilters = getValidFilters(
      {
        ...selectedFilters,
        [filterKey]: value,
      },
      filtersMap,
    );
    updateSelectedFilters(validFilters);
    onSelectedFiltersChange();
  };

  return (
    <>
      {pinnedFilters.map((filterKey) => (
        <Col key={filterKey} flex={filtersMap[filterKey].width}>
          <DataGridFilterItem
            width="200px"
            filter={filtersMap[filterKey]}
            defaultValue={selectedFilters[filterKey]?.value}
            value={selectedFilters[filterKey]?.value}
            disabled={selectModeEnabled}
            onChange={handleFilterChange}
          />
        </Col>
      ))}
    </>
  );
};
