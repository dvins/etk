import { Popover } from 'antd';
import { Duration } from 'luxon';

export const timeDurationInMsRenderer = (val: string) => {
  if (!val) return <span title="no milliseconds" />;

  const numberMs = Number(val);

  if (Number.isNaN(numberMs)) return <span title="no milliseconds" />;

  const roundedMs = Math.round(numberMs);
  const durationSec = Duration.fromObject({ milliseconds: roundedMs }).shiftTo('seconds');
  const durationMs = Duration.fromObject({ milliseconds: roundedMs }).shiftTo('milliseconds');

  // Fractional seconds formatter for up to two decimal significance
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const seconds = durationSec.seconds > 0 ? `${formatter.format(durationSec.seconds)}\u202Fs ` : '';
  const milliseconds = durationMs.milliseconds > 0 ? `${durationMs.milliseconds}\u202Fms ` : '';

  const cellValue = durationSec.seconds >= 1 ? `${seconds}` : `${milliseconds}`;
  const cellTooltip = `${roundedMs.toLocaleString()} ms`;

  return <Popover content={cellTooltip}>{cellValue}</Popover>;
};
