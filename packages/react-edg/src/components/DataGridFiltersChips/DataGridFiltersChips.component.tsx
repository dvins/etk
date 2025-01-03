import { useFiltersStore } from '@datagrid/stores/filters';
import { flatten, uniq } from 'lodash';
import { useMemo } from 'react';

import { CollapsedFiltersChips } from './CollapsedFiltersChips';

import type { DataGridFiltersChipsProps } from './DataGridFiltersChips.types';
import type { DataGridFilterChips } from '@datagrid/types';

export const DataGridFiltersChips: React.FC<DataGridFiltersChipsProps> = ({ onSelectedFiltersChange }) => {
  const { selectedFilters, filtersMap, updateSelectedFilters } = useFiltersStore();

  const removeFilter = (filterChips: DataGridFilterChips) => () => {
    const updatedFilters = filterChips.removeFilter(filterChips.key, selectedFilters, filterChips.data.value);
    updateSelectedFilters(updatedFilters);
    onSelectedFiltersChange();
  };

  const filtersChips = useMemo(() => {
    return flatten(
      Object.keys(selectedFilters).map((filterKey) => {
        const filterValue = selectedFilters[filterKey]?.value;

        const filter = filtersMap[filterKey];
        const options = filter?.options ?? [];
        const selectedOptions = filter?.selectedOptions ?? [];
        const filterOptions = uniq([...options, ...selectedOptions]);

        return filtersMap[filterKey].toFilterChips(filterValue, filterOptions);
      }),
    );
  }, [filtersMap, selectedFilters]);

  if (!filtersChips) {
    return null;
  }

  return <CollapsedFiltersChips filtersChips={filtersChips} removeFilter={removeFilter} />;
};
