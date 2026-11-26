import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { apiConfig } from "@/config/api";
import { getEchoSocketId } from "./echo";

export const TOKEN_KEY = "joalheria_admin_token";
export const USER_KEY = "joalheria_admin_user";

/** Extracts a readable message from a Laravel error response (validation, 401, 500...). */
export function getErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado."): string {
  const err = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
  if (!err?.isAxiosError) return (error as Error)?.message || fallback;
  if (!err.response) return "Não foi possível conectar à API. Verifique se o backend está no ar.";
  if (err.response.status === 429) return "Muitas tentativas em sequência. Aguarde um minuto e tente novamente.";
  const firstValidation = err.response.data?.errors && Object.values(err.response.data.errors)[0]?.[0];
  return firstValidation || err.response.data?.message || fallback;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create(apiConfig);
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request: bearer token + socket id
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // Lets the API exclude this browser from its own real-time broadcasts.
        const socketId = getEchoSocketId();
        if (socketId && config.headers) {
          config.headers["X-Socket-ID"] = socketId;
        }
        // Let the browser set the multipart boundary for uploads.
        if (config.data instanceof FormData && config.headers) {
          delete config.headers["Content-Type"];
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response: global 401 handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const isLoginCall = error.config?.url?.includes("/auth/login");
        if (error.response?.status === 401 && !isLoginCall) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          if (window.location.pathname !== "/login") window.location.href = "/login";
        }
        if (error.response?.status === 403) {
          console.error("Access forbidden");
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T>(url: string, config = {}): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config = {}): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config = {}): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config = {}): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config = {}): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
