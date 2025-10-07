import { ObjectId } from 'mongodb';

export interface CsvApplication {
  _id?: ObjectId;
  applicationName: string;
  uploadedAt: Date;
  fileName: string;
  fileSize: number;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  status: 'processing' | 'completed' | 'failed';
  data: Array<Record<string, any>>;
  errors?: Array<{
    row: number;
    error: string;
    data?: Record<string, any>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CsvUploadResult {
  success: boolean;
  applicationId?: string;
  message: string;
  totalRecords?: number;
  processedRecords?: number;
  failedRecords?: number;
  errors?: Array<{
    row: number;
    error: string;
    data?: Record<string, any>;
  }>;
}