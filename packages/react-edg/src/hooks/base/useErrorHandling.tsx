import { useErrorStore } from '@datagrid/stores/error';
import { notification } from 'antd';
import { useEffect } from 'react';

import type { ApolloError } from '@apollo/client';

const ERROR_NOTIFICATION_CONFIG = {
  duration: 0,
  style: {
    backgroundColor: '#fff2f0',
    borderColor: '#ffccc7',
  },
};

export const useErrorHandling = (defaultError?: unknown) => {
  const { errors, setError: setErrorToStore, clearErrors } = useErrorStore();

  const showErrorNotification = (message: string) => {
    notification.error({
      message: 'Sorry, an error occurred',
      description: message,
      ...ERROR_NOTIFICATION_CONFIG,
    });
  };

  const setError = (error: ApolloError) => {
    setErrorToStore(error);
    showErrorNotification(error.message);
  };

  useEffect(() => {
    if (defaultError) {
      // TODO: handler different types of errors
      setError(defaultError as ApolloError);
    }
  }, [defaultError]);

  return {
    errors,
    setError,
    clearErrors,
  };
};
