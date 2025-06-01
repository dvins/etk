import { useErrorHandling } from '@datagrid/hooks/base';
import { useKeyPress } from 'ahooks';
import { Alert, List, Space } from 'antd';
import { useEffect, useState } from 'react';

export const DataGridDevError: React.FC = () => {
  const { errors, clearErrors } = useErrorHandling();
  const [devMode, setDevMode] = useState(false);

  const hasError = errors.length > 0;

  useEffect(() => {
    // Clear errors on component unmount
    return () => {
      if (hasError) {
        clearErrors();
      }
    };
  }, []);

  useKeyPress(['ctrl.alt.d', 'meta.alt.d'], () => {
    setDevMode((prev) => !prev);
  });

  const errorMessages = errors
    .map((error) => {
      if (Array.isArray(error)) {
        return error;
      }

      if (error.message) {
        return [{ message: error.message }];
      }

      return [];
    })
    .flat();

  if (!hasError || !devMode) return null;

  return (
    <Alert
      type="error"
      showIcon
      message={
        <List
          dataSource={errorMessages}
          size="small"
          header={<div style={{ fontWeight: 'bolder' }}>Data Grid Errors:</div>}
          renderItem={(error, index) => (
            <List.Item key={index}>
              <Space align="start">
                <div>{index + 1}:</div>
                <div>{error.message}</div>
              </Space>
            </List.Item>
          )}
        />
      }
    />
  );
};
