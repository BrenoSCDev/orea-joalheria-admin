import { apiClient, getErrorMessage, TOKEN_KEY, USER_KEY } from "./apiClient";
import { endpoints } from "@/config/api";
import { LoginCredentials, LoginResponse, User } from "@/types/auth";
import { ApiResponse } from "@/types/api";

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>(endpoints.auth.login, credentials);
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      return response;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Falha no login"));
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post(endpoints.auth.logout);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  async me(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(endpoints.auth.me);
    return response.data;
  },

  getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};
