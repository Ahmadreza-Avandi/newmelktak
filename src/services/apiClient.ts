import type { ApiResponse } from "../types/index.ts";

const TOKEN_KEY = "amlak_session_token";

class ApiClient {
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      } catch {
        // Ignore storage access errors
      }
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      try {
        if (token) {
          sessionStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          sessionStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        // Ignore storage access errors
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  onUnauthorized(callback: (() => void) | null) {
    this.onUnauthorizedCallback = callback;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const config: RequestInit = {
      ...options,
      credentials: "include",
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);
      if (response.status === 401) {
        this.setToken(null);
        if (this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback();
        }
        const errBody = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: errBody.error?.code || "UNAUTHORIZED",
            message:
              errBody.error?.message ||
              "نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.",
          },
        };
      }

      if ((response.headers.get("content-type") || "").includes("application/json")) {
        return await response.json();
      }

      return {
        success: false,
        error: {
          code: "SERVER_UNAVAILABLE",
          message: "پاسخ نامعتبر از سرور دریافت شد. لطفاً چند لحظه بعد تلاش کنید.",
        },
      };
    } catch (error) {
      console.error(`[API Network Error] ${url}:`, error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "ارتباط با سرور برقرار نشد. لطفاً وضعیت اینترنت را بررسی فرمایید.",
        },
      };
    }
  }

  get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  async upload<T = any>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });

      if (response.status === 401) {
        this.setToken(null);
        if (this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback();
        }
        const errBody = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: errBody.error?.code || "UNAUTHORIZED",
            message:
              errBody.error?.message ||
              "نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.",
          },
        };
      }

      if (!(response.headers.get("content-type") || "").includes("application/json")) {
        const text = await response.text().catch(() => "");
        console.error(`[Upload Non-JSON Response] ${url}:`, text);
        return {
          success: false,
          error: {
            code: "SERVER_ERROR",
            message: "خطا در پردازش سرور هنگام بارگذاری فایل.",
          },
        };
      }

      return await response.json();
    } catch (error) {
      console.error(`[Upload Network Error] ${url}:`, error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "ارتباط با سرور برای بارگذاری برقرار نشد. لطفاً وضعیت اینترنت را بررسی فرمایید.",
        },
      };
    }
  }
}

export const api = new ApiClient();
export type { ApiResponse };
