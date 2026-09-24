import { useAuthStore } from '../store/useAuthStore';

export const API_BASE_URL = 'http://localhost:5239/api';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = useAuthStore.getState().token;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const requestOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers,
  };

  let response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);

  if (
    response.status === 401 &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/register') &&
    !endpoint.includes('/auth/refresh-token') &&
    !endpoint.includes('/auth/google-login')
  ) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        failedQueue.push({
          resolve: () => {
            const newToken = useAuthStore.getState().token;
            const retryHeaders = new Headers(options.headers);
            if (!retryHeaders.has('Content-Type') && !(options.body instanceof FormData)) {
              retryHeaders.set('Content-Type', 'application/json');
            }
            if (newToken) {
              retryHeaders.set('Authorization', `Bearer ${newToken}`);
            }
            fetch(`${API_BASE_URL}${endpoint}`, {
              ...options,
              credentials: 'include',
              headers: retryHeaders,
            })
              .then(async (res) => {
                const text = await res.text();
                return text ? JSON.parse(text) : {};
              })
              .then((data) => resolve(data))
              .catch((err) => reject(err));
          },
          reject: (err) => reject(err),
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const refreshText = await refreshResponse.text();
      const refreshData = refreshText ? JSON.parse(refreshText) : {};

      if (refreshResponse.ok && refreshData.success && refreshData.data?.accessToken) {
        const newAccessToken = refreshData.data.accessToken;
        useAuthStore.getState().setAccessToken(newAccessToken);

        processQueue(null);

        // Retry original request with new access token
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          credentials: 'include',
          headers,
        });
      } else {
        processQueue(new Error('Session expired'));
        useAuthStore.getState().logout();
        throw {
          status: 401,
          message: 'Session expired. Please log in again.',
        };
      }
    } catch (refreshErr) {
      processQueue(refreshErr);
      useAuthStore.getState().logout();
      throw {
        status: 401,
        message: 'Session expired. Please log in again.',
      };
    } finally {
      isRefreshing = false;
    }
  }

  const rawText = await response.text();
  let data: any = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (_) {
      data = { message: rawText };
    }
  }

  if (!response.ok) {
    let normalizedErrors: string[] = [];
    if (Array.isArray(data?.errors)) {
      normalizedErrors = data.errors;
    } else if (data?.errors && typeof data.errors === 'object') {
      normalizedErrors = Object.entries(data.errors).flatMap(([field, msgs]) =>
        Array.isArray(msgs)
          ? msgs.map((m) => `${field}: ${m}`)
          : [`${field}: ${String(msgs)}`]
      );
    }

    const error = new Error(
      data?.message || data?.title || `Yêu cầu thất bại với mã lỗi ${response.status}`
    );

    Object.assign(error, {
      status: response.status,
      errors: normalizedErrors,
    });

    throw error;
  }

  return data;
}
