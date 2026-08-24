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
