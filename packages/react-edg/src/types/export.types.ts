import type { DataGridParameters } from './parameters.types';

export type DataExportHandler = (parameters: DataGridParameters) => Promise<void>;
