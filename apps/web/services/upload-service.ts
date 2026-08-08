import { apiClient } from '@/lib/api-client';

export interface UploadResult {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

export const uploadService = {
  uploadFile: async (file: File, token?: string | null): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<UploadResult>('/uploads/file', formData, { token });
  },

  uploadMultipleFiles: async (files: File[], token?: string | null): Promise<UploadResult[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return apiClient.post<UploadResult[]>('/uploads/multiple', formData, { token });
  },
};
