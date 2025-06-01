import type { DataGridError } from '@datagrid/types';

interface ErrorActions {
  setError: (error: DataGridError) => void;
  clearErrors: () => void;
}

export interface ErrorStore {
  errors: Error[];
  actions: ErrorActions;
}
