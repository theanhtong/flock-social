import { apiClient } from '@/lib/api-client';
import { UserProfile } from './user-service';

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  totalPosts: number;
  pendingReports: number;
}

export interface AdminUsersQueryParams {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

export interface AuditLogItem {
  id: string;
  adminId: string;
  action: string;
  targetId: string;
  targetType: string;
  metadata?: any;
  createdAt: string;
  admin?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

export type SanctionType = 'warning' | 'suspension' | 'ban';

export const adminUserService = {
  getSystemStats: async (token?: string | null): Promise<SystemStats> => {
    return apiClient.get<SystemStats>('/admin/users/stats', { token });
  },

  getUsers: async (
    params: AdminUsersQueryParams = {},
    token?: string | null,
  ): Promise<PaginatedResult<UserProfile>> => {
    const query = new URLSearchParams();
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.role) query.set('role', params.role);

    const queryString = query.toString();
    return apiClient.get<PaginatedResult<UserProfile>>(
      `/admin/users${queryString ? `?${queryString}` : ''}`,
      { token },
    );
  },

  getAuditLogs: async (
    params: { cursor?: string; limit?: number } = {},
    token?: string | null,
  ): Promise<PaginatedResult<AuditLogItem>> => {
    const query = new URLSearchParams();
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString();
    return apiClient.get<PaginatedResult<AuditLogItem>>(
      `/admin/users/audit-logs${queryString ? `?${queryString}` : ''}`,
      { token },
    );
  },

  updateUserRole: async (
    userId: string,
    role: string,
    token?: string | null,
  ): Promise<UserProfile> => {
    return apiClient.patch<UserProfile>(
      `/admin/users/${userId}/role`,
      { role },
      { token },
    );
  },

  updateUserStatus: async (
    userId: string,
    status: string,
    token?: string | null,
  ): Promise<UserProfile> => {
    return apiClient.patch<UserProfile>(
      `/admin/users/${userId}/status`,
      { status },
      { token },
    );
  },


  sanctionUser: async (
    userId: string,
    data: { type: SanctionType; reason: string; durationDays?: number; reportId?: string },
    token?: string | null,
  ): Promise<any> => {
    return apiClient.post(`/admin/users/${userId}/sanction`, data, { token });
  },

  banUser: async (
    userId: string,
    data: { reason: string; durationDays?: number },
    token?: string | null,
  ): Promise<any> => {
    return apiClient.post(`/admin/users/${userId}/ban`, data, { token });
  },

  unbanUser: async (
    userId: string,
    data: { liftReason: string },
    token?: string | null,
  ): Promise<any> => {
    return apiClient.post(`/admin/users/${userId}/unban`, data, { token });
  },

  restoreUser: async (
    userId: string,
    token?: string | null,
  ): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>(`/admin/users/${userId}/restore`, {}, { token });
  },

  deleteUser: async (
    userId: string,
    token?: string | null,
  ): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/admin/users/${userId}`, { token });
  },
};
