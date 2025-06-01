import { DataGridFilterItem } from '@datagrid/components';
import { FILTERS_PANEL } from '@datagrid/constants';
import { useFilters } from '@datagrid/hooks/filters';
import { useSelectMode } from '@datagrid/hooks/selection';
import { getValidFilters } from '@datagrid/utils/filters';
import { useDebounceEffect, useUpdateEffect } from 'ahooks';
import { Button, Space, Divider, Input } from 'antd';
import { isEqual } from 'lodash';
import { useMemo, useState } from 'react';

import { Styled } from './DataGridFiltersPanel.styles';
import { useFiltersPanelAnimation } from './hooks';

import type { DataGridFiltersPanelProps } from './DataGridFiltersPanel.types';
import type { DataGridFilter, DataGridFiltersType, DataGridFilterValue } from '@datagrid/types';

export const DataGridFiltersPanel: React.FC<DataGridFiltersPanelProps> = ({
  open,
  onClose,
  onSelectedFiltersChange,
}) => {
  const { filters, selectedFilters, defaultFilters, filtersMap, pinnedFilters, updateSelectedFilters } = useFilters();
  const [interimSelectedFilters, setInterimSelectedFilters] = useState<DataGridFiltersType>(selectedFilters);
  const [searchedFilters, setSearchedFilters] = useState<DataGridFilter[]>(filters);
  const { selectModeEnabled } = useSelectMode();
  const [searchSubstring, setSearchSubstring] = useState('');

  const animationStyles = useFiltersPanelAnimation({
    isOpen: open,
    containerWidth: FILTERS_PANEL.width,
  });

  const showApplyButton = interimSelectedFilters !== selectedFilters;

  useUpdateEffect(() => {
    // Sync interim filters with selected filters
    if (selectedFilters !== interimSelectedFilters) {
      setInterimSelectedFilters(selectedFilters);
    }
  }, [selectedFilters]);

  const saveSelectedFilters = (filters: DataGridFiltersType) => {
    updateSelectedFilters(filters);
    onSelectedFiltersChange();
  };

  const handleFilterChange = (filterKey: string, filterValue: DataGridFilterValue) => {
    setInterimSelectedFilters((prevFilters) => {
      const previousFilterValue = prevFilters[filterKey]?.value;
      const isValueEmpty = filtersMap[filterKey].isFilterEmpty(filterValue.value);
      const isPrevValueEmpty = previousFilterValue ? filtersMap[filterKey].isFilterEmpty(previousFilterValue) : true;

      const isSameValue = isEqual(filterValue.value, previousFilterValue);
      const isStillEmpty = isValueEmpty && isPrevValueEmpty;

      if (isStillEmpty || isSameValue) {
        return prevFilters;
      }

      return {
        ...prevFilters,
        [filterKey]: filterValue,
      };
    });
  };

  const closePanel = () => {
    onClose();
    setSearchSubstring('');
  };

  const cancelFilters = () => {
    setInterimSelectedFilters(selectedFilters);
    closePanel();
  };

  const clearAllFilters = () => {
    saveSelectedFilters({});
    closePanel();
  };

  const resetFilters = () => {
    // The spread operator is intentionally used to force filters render
    saveSelectedFilters({ ...defaultFilters });
    closePanel();
  };

  const searchFilters = (substring: string, filters: DataGridFilter[]) => {
    const foundFilters = filters.filter((filter) => filter.label.toLocaleLowerCase().includes(substring.toLowerCase()));

    setSearchedFilters(foundFilters);
  };

  useDebounceEffect(() => searchFilters(searchSubstring, filters), [searchSubstring, filters], { wait: 100 });

  const applyFilters = () => {
    saveSelectedFilters(getValidFilters(interimSelectedFilters, filtersMap));
    closePanel();
  };

  const filterItems = useMemo(() => {
    return searchedFilters.map((filter) => {
      const { key: filterKey } = filter;
      const showFilter = filter.showInPanel;

      if (!showFilter) {
        return null;
      }

      const defaultValue = selectedFilters[filterKey]?.value;
      const value = interimSelectedFilters[filterKey]?.value;
      const pinned = pinnedFilters.includes(filterKey);

      return (
        <DataGridFilterItem
          key={filterKey}
          filter={filter}
          onChange={handleFilterChange}
          defaultValue={defaultValue}
          pinned={pinned}
          value={value}
        />
      );
    });
  }, [searchedFilters, selectedFilters, interimSelectedFilters]);

  if (!filters.length) {
    return null;
  }

  return (
    <Styled.Container style={animationStyles}>
      <Styled.Header>
        <span>Filters</span>
        <Space>
          {showApplyButton && (
            <Button size="small" onClick={applyFilters}>
              Apply
            </Button>
          )}
          <Button type="link" size="small" onClick={cancelFilters}>
            Cancel
          </Button>
        </Space>
      </Styled.Header>
      <Styled.ChildrenContainer>
        <Input.Search
          placeholder="Find a filter"
          allowClear
          value={searchSubstring}
          onChange={({ target }) => setSearchSubstring(target.value)}
        />
        <Divider
          style={{
            margin: '1rem 0',
          }}
        />
        <Space direction="vertical" style={{ width: '100%' }}>
          {filterItems}
        </Space>
      </Styled.ChildrenContainer>

      <Styled.ButtonsContent>
        <Button onClick={clearAllFilters} disabled={selectModeEnabled}>
          Clear All
        </Button>

        <div>
          <Button onClick={resetFilters} disabled={selectModeEnabled}>
            Default
          </Button>
          <Button onClick={applyFilters} disabled={selectModeEnabled}>
            Apply
          </Button>
        </div>
      </Styled.ButtonsContent>
    </Styled.Container>
  );
};
