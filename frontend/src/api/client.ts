import axios, { AxiosError } from "axios";
import type { ApiError } from "./types";

const TOKEN_KEY = "si.token";

export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable: session lasts until reload */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Base URL is relative: Vite proxies /api in dev, nginx proxies it in Docker. */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
});

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const isLogin = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLogin) onUnauthorized?.();
    return Promise.reject(error);
  },
);

/** Turns any API failure into a sentence a person can act on. */
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Partial<ApiError> | undefined;
    if (data?.fieldErrors) {
      return Object.entries(data.fieldErrors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join("; ");
    }
    if (data?.message) return data.message;
    if (!error.response) return "Can't reach the server. Check that the backend is running on port 8080.";
  }
  return "Something went wrong. Please try again.";
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error)) {
    return ((error.response?.data as Partial<ApiError>)?.fieldErrors ?? {}) as Record<string, string>;
  }
  return {};
}

/** Downloads a CSV (or any file) from an authenticated endpoint. */
export async function downloadFile(url: string, fallbackName: string) {
  const res = await http.get(url, { responseType: "blob" });
  const disposition = res.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const name = match?.[1] ?? fallbackName;
  const href = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
