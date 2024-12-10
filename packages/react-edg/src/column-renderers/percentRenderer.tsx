import styled from 'styled-components';

import type { ReactNode } from 'react';

const PercentWrapper = styled.div`
  display: inline-block;

  /* using classes to allow modifying them from the parent wrapper */
  .big-text {
    display: inline-block;
  }

  .small-text {
    font-size: smaller;
    text-transform: uppercase;
  }
`;

const numberToPercent = (decimal: number): { result: string; tooltip: string } => {
  const cellTooltip = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 3,
  }).format(decimal);

  const option: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  };

  const formatter = new Intl.NumberFormat('en-US', option);
  const formattedResult = formatter.format(decimal);

  return { result: formattedResult, tooltip: cellTooltip };
};

type PercentRendererOptions = {
  skipZero?: boolean;
};

export const percentRenderer = (value: string, options: PercentRendererOptions = {}): ReactNode => {
  const num = Number(value);

  if (Number.isNaN(num)) {
    return '';
  }

  if (num === 0 && options.skipZero) {
    return '';
  }

  const { tooltip: cellTooltip, result: formattedResult } = numberToPercent(num);

  const [integer, decimal] = formattedResult.split('.');

  return (
    <PercentWrapper title={cellTooltip}>
      <span className="big-text">{integer}</span>
      <span className="small-text">{`.${decimal}`}</span>
    </PercentWrapper>
  );
};
