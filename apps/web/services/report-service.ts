import { apiClient } from '@/lib/api-client';

export interface ReportItem {
  id: string;
  reporterId: string;
  targetType: 'user' | 'post' | 'comment';
  targetId: string;
  reason: 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'nudity' | 'misinformation' | 'impersonation' | 'other';
  details?: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reviewedById?: string | null;
  reviewedAt?: string | null;
  resolution?: string | null;
  createdAt: string;
  reporter: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  reviewedBy?: {
    id: string;
    username: string;
    displayName: string;
  } | null;
  targetDetails?: any;
}

export interface QueryReportsParams {
  cursor?: string;
  limit?: number;
  status?: string;
  targetType?: string;
}

export const reportService = {
  createReport: async (
    data: {
      targetType: 'user' | 'post' | 'comment';
      targetId: string;
      reason: string;
      details?: string;
    },
    token?: string | null,
  ): Promise<any> => {
    return apiClient.post('/reports', data, { token });
  },

  getReports: async (
    params: QueryReportsParams = {},
    token?: string | null,
  ): Promise<{ data: ReportItem[]; meta: { limit: number; nextCursor: string | null; hasNextPage: boolean } }> => {
    const query = new URLSearchParams();
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.status) query.set('status', params.status);
    if (params.targetType) query.set('targetType', params.targetType);

    const q = query.toString();
    return apiClient.get(`/admin/reports${q ? `?${q}` : ''}`, { token });
  },

  resolveReport: async (
    id: string,
    data: { resolution?: string; deleteContent?: boolean },
    token?: string | null,
  ): Promise<ReportItem> => {
    return apiClient.patch(`/admin/reports/${id}/resolve`, data, { token });
  },

  dismissReport: async (
    id: string,
    token?: string | null,
  ): Promise<ReportItem> => {
    return apiClient.patch(`/admin/reports/${id}/dismiss`, {}, { token });
  },
};
