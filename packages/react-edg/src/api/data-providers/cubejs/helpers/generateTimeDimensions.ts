import { fieldToString } from './fieldToString';

import type { CubejsTimeDimension, CubejsTimeDimensionFilter, DataProviderParams } from '@datagrid/api/types';

export const generateTimeDimensions = (
  filters: DataProviderParams['filters'],
  timeDimensionFilters?: CubejsTimeDimensionFilter[],
): CubejsTimeDimension[] => {
  if (!timeDimensionFilters) {
    return [];
  }

  return timeDimensionFilters.reduce<CubejsTimeDimension[]>((timeDimensions, timeDimensionFilter) => {
    const selectedTimeDimensionFilter = filters.find(
      (f) => fieldToString(f.field) === fieldToString(timeDimensionFilter.field),
    );

    if (!selectedTimeDimensionFilter) {
      return timeDimensions;
    }

    const timeDimension = timeDimensionFilter.filterToTimeDimension(selectedTimeDimensionFilter);

    if (!timeDimension) {
      return timeDimensions;
    }

    return [...timeDimensions, timeDimension];
  }, []);
};
