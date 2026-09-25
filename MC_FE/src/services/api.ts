import { useAuthStore } from "../store/useAuthStore";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5239/api";

let isRefreshing = false;

let failedQueue: Array<{
  resolve: () => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });

  failedQueue = [];
};

async function parseResponse(response: Response): Promise<any> {
  // 204 / 205 không có body
  if (
    response.status === 204 ||
    response.status === 205
  ) {
    return undefined;
  }

  const text = await response.text();

  // Body rỗng
  if (!text.trim()) {
    return undefined;
  }

  const contentType =
    response.headers.get("content-type") || "";

  // JSON
  if (
    contentType.includes("application/json") ||
    contentType.includes("+json")
  ) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `Server trả về JSON không hợp lệ. HTTP ${response.status}`
      );
    }
  }

  // Plain text / HTML
  return text;
}

function createHeaders(
  options: RequestInit,
  token?: string | null
) {
  const headers = new Headers(options.headers);

  if (
    !headers.has("Content-Type") &&
    !(options.body instanceof FormData)
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  if (
    token &&
    !headers.has("Authorization")
  ) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  return headers;
}

function shouldRefresh(endpoint: string) {
  return (
    !endpoint.includes("/auth/login") &&
    !endpoint.includes("/auth/register") &&
    !endpoint.includes("/auth/refresh-token") &&
    !endpoint.includes("/auth/google-login")
  );
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    useAuthStore.getState().token;

  let headers =
    createHeaders(options, token);

  let response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      credentials: "include",
      headers,
    }
  );

  // ============================================================
  // ACCESS TOKEN EXPIRED
  // ============================================================

  if (
    response.status === 401 &&
    shouldRefresh(endpoint)
  ) {
    if (isRefreshing) {
      await new Promise<void>(
        (resolve, reject) => {
          failedQueue.push({
            resolve,
            reject,
          });
        }
      );

      const newToken =
        useAuthStore.getState().token;

      const retryHeaders =
        createHeaders(
          options,
          newToken
        );

      response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          ...options,
          credentials: "include",
          headers: retryHeaders,
        }
      );
    } else {
      isRefreshing = true;

      try {
        const refreshResponse =
          await fetch(
            `${API_BASE_URL}/auth/refresh-token`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              credentials: "include",
            }
          );

        const refreshData =
          await parseResponse(
            refreshResponse
          );

        if (
          refreshResponse.ok &&
          refreshData?.success &&
          refreshData?.data?.accessToken
        ) {
          const newAccessToken =
            refreshData.data.accessToken;

          useAuthStore
            .getState()
            .setAccessToken(
              newAccessToken
            );

          processQueue();

          headers =
            createHeaders(
              options,
              newAccessToken
            );

          response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
              ...options,
              credentials: "include",
              headers,
            }
          );
        } else {
          const error =
            new Error(
              "Session expired. Please log in again."
            );

          Object.assign(error, {
            status: 401,
          });

          processQueue(error);

          useAuthStore
            .getState()
            .logout();

          throw error;
        }
      } catch (error) {
        processQueue(error);

        useAuthStore
          .getState()
          .logout();

        throw error;
      } finally {
        isRefreshing = false;
      }
    }
  }

  // ============================================================
  // PARSE RESPONSE
  // ============================================================

  const data =
    await parseResponse(response);

  // ============================================================
  // HTTP ERROR
  // ============================================================

  if (!response.ok) {
    let normalizedErrors: string[] = [];

    if (
      typeof data === "object" &&
      data !== null
    ) {
      if (Array.isArray(data.errors)) {
        normalizedErrors =
          data.errors.map(String);
      } else if (
        data.errors &&
        typeof data.errors === "object"
      ) {
        normalizedErrors =
          Object.entries(
            data.errors
          ).flatMap(
            ([field, messages]) => {
              if (
                Array.isArray(messages)
              ) {
                return messages.map(
                  (message) =>
                    `${field}: ${String(
                      message
                    )}`
                );
              }

              return [
                `${field}: ${String(
                  messages
                )}`,
              ];
            }
          );
      }
    }

    let message =
      `Request failed (${response.status})`;

    if (
      typeof data === "object" &&
      data !== null
    ) {
      message =
        data.message ||
        data.title ||
        message;
    } else if (
      typeof data === "string" &&
      data.trim()
    ) {
      message = data;
    }

    const error =
      new Error(message);

    Object.assign(error, {
      status: response.status,
      errors: normalizedErrors,
    });

    throw error;
  }

  return data as T;
}