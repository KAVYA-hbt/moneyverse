import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'finguru_admin_token';

let inMemoryToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

export const apiClient = axios.create({
  baseURL: '/api',
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A stale/expired token (there's no login page -- see AuthContext's silent dev-account
// bootstrap) otherwise fails every request forever with no visible error: stat cards just
// sit in their loading state. Clearing the token and reloading re-triggers that bootstrap
// login flow, since it only runs when getAuthToken() is empty.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && getAuthToken()) {
      setAuthToken(null);
      window.location.reload();
    }
    return Promise.reject(error);
  },
);

export interface ApiError {
  status: number | undefined;
  detail: string;
}

export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const detail =
      (err.response?.data as { detail?: string } | undefined)?.detail ??
      err.message;
    return { status: err.response?.status, detail };
  }
  return { status: undefined, detail: 'Unknown error' };
}
