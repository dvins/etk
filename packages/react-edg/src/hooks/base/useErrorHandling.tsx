import { useErrorStore } from '@datagrid/stores/error';
import { notification } from 'antd';
import { useEffect } from 'react';

import type { DataGridError } from '@datagrid/types';

const ERROR_NOTIFICATION_CONFIG = {
  duration: 0,
  style: {
    backgroundColor: '#fff2f0',
    borderColor: '#ffccc7',
  },
};

type UseErrorHandling = (defaultError?: DataGridError) => ReturnType<typeof useErrorStore>;

export const useErrorHandling: UseErrorHandling = (defaultError) => {
  const { errors, setError: setErrorToStore, clearErrors } = useErrorStore();

  const showErrorNotification = () => {
    notification.error({
      message: 'Sorry, an error occurred',
      description: 'Something went wrong while loading the data. Please try again later.',
      ...ERROR_NOTIFICATION_CONFIG,
    });
  };

  const setError = (error: DataGridError) => {
    setErrorToStore(error);
    showErrorNotification();
  };

  useEffect(() => {
    if (defaultError) {
      setError(defaultError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultError]);

  return {
    errors,
    setError,
    clearErrors,
  };
};
