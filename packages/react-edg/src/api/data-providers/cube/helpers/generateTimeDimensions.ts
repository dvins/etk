import { fieldToString } from './fieldToString';

import type { CubeTimeDimension, CubeTimeDimensionFilter, DataProviderParams } from '@datagrid/api/types';

export const generateTimeDimensions = (
  filters: DataProviderParams['filters'],
  timeDimensionFilters?: CubeTimeDimensionFilter[],
): CubeTimeDimension[] => {
  if (!timeDimensionFilters) {
    return [];
  }

  return timeDimensionFilters.reduce<CubeTimeDimension[]>((timeDimensions, timeDimensionFilter) => {
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
