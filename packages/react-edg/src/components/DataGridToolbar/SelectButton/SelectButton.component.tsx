import { useDataGridTheme } from '@datagrid/theme/hooks';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from 'antd';
import React from 'react';

import { BaseButton } from '../BaseButton';

import type { SelectButtonProps } from './SelectButton.types';

export const SelectButton: React.FC<SelectButtonProps> = ({
  selectModeEnabled,
  disableSelectMode,
  enableSelectMode,
}) => {
  const theme = useDataGridTheme();

  if (selectModeEnabled) {
    return (
      <Button type="link" style={{ fontSize: theme.font.size.medium }} onClick={disableSelectMode}>
        Done
      </Button>
    );
  }

  return (
    <BaseButton icon={<FontAwesomeIcon icon={faCheck} />} onClick={enableSelectMode}>
      Select
    </BaseButton>
  );
};
