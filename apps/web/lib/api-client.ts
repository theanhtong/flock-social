import { useAuthStore } from '@/store/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Global refresh state to prevent race conditions on concurrent 401s
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

export async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, headers: customHeaders, body, ...customOptions } = options;

  const currentToken = token ?? useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  const fullUrl = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(fullUrl, {
    headers,
    credentials: 'include', // Needed for HttpOnly refresh cookies
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    ...customOptions,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  // If request failed with 401 Unauthorized (and it's not an auth route itself)
  if (
    response.status === 401 &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/register') &&
    !endpoint.includes('/auth/refresh')
  ) {
    if (!isRefreshing) {
      isRefreshing = true;

      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData?.accessToken) {
            const newAccessToken = refreshData.accessToken;
            useAuthStore.getState().setToken(newAccessToken);
            if (refreshData.user) {
              useAuthStore.getState().setUser(refreshData.user);
            }

            processQueue(null, newAccessToken);

            // Retry original request with the new access token
            headers['Authorization'] = `Bearer ${newAccessToken}`;
            const retryResponse = await fetch(fullUrl, {
              headers,
              credentials: 'include',
              body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
              ...customOptions,
            });

            const retryContentType = retryResponse.headers.get('content-type');
            const retryIsJson = retryContentType && retryContentType.includes('application/json');
            const retryData = retryIsJson ? await retryResponse.json() : await retryResponse.text();

            if (!retryResponse.ok) {
              const errorMessage =
                (retryIsJson && retryData?.message) ||
                (Array.isArray(retryData?.message) ? retryData.message.join(', ') : null) ||
                `Request failed with status ${retryResponse.status}`;
              throw new ApiError(retryResponse.status, errorMessage, retryData);
            }

            return retryData as T;
          }
        }

        // Refresh failed -> Clear session and open login modal
        useAuthStore.getState().setToken(null);
        useAuthStore.getState().setUser(null);
        useAuthStore.getState().openLoginModal();
        const refreshErr = new ApiError(401, 'Session expired. Please log in again.');
        processQueue(refreshErr);
        throw refreshErr;
      } catch (err) {
        useAuthStore.getState().setToken(null);
        useAuthStore.getState().setUser(null);
        useAuthStore.getState().openLoginModal();
        processQueue(err);
        throw err;
      } finally {
        isRefreshing = false;
      }
    } else {
      // Refresh is already in progress -> Queue request until new token is available
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        return request<T>(endpoint, { ...options, token: newToken });
      });
    }
  }

  if (!response.ok) {
    const errorMessage =
      (isJson && data?.message) ||
      (Array.isArray(data?.message) ? data.message.join(', ') : null) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorMessage, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
