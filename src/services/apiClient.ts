import type { ApiResponse } from "../types/index.ts";

const TOKEN_KEY = "amlak_session_token";

class ApiClient {
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;
  private onSubscriptionBlockedCallback: ((code: string, message: string) => void) | null = null;

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

  onSubscriptionBlocked(callback: ((code: string, message: string) => void) | null) {
    this.onSubscriptionBlockedCallback = callback;
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
          status: 401,
          error: {
            code: errBody.error?.code || "UNAUTHORIZED",
            message:
              errBody.error?.message ||
              "نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.",
          },
        };
      }

      if ((response.headers.get("content-type") || "").includes("application/json")) {
        const parsed = await response.json().catch(() => null);
        if (parsed && typeof parsed === "object") {
          const errCode = parsed?.error?.code;
          if (
            (response.status === 402 || response.status === 403) &&
            (errCode === "SUBSCRIPTION_EXPIRED" || errCode === "AGENCY_SUSPENDED") &&
            this.onSubscriptionBlockedCallback
          ) {
            this.onSubscriptionBlockedCallback(
              errCode,
              parsed?.error?.message || "اشتراک دفتر املاک غیرفعال شده است.",
            );
          }
          return {
            ...parsed,
            status: response.status,
          };
        }
      }

      if (response.status === 429) {
        return {
          success: false,
          status: 429,
          error: {
            code: "RATE_LIMITED",
            message: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند دقیقه دیگر دوباره تلاش کنید.",
          },
        };
      }

      if (response.status >= 500) {
        return {
          success: false,
          status: response.status,
          error: {
            code: "SERVER_UNAVAILABLE",
            message: "سرور موقتاً در دسترس نیست یا خطای داخلی رخ داده است. لطفاً چند لحظه بعد دوباره تلاش کنید.",
          },
        };
      }

      return {
        success: false,
        status: response.status,
        error: {
          code: "SERVER_UNAVAILABLE",
          message: "پاسخ نامعتبر از سرور دریافت شد. لطفاً چند لحظه بعد تلاش کنید.",
        },
      };
    } catch (error) {
      console.error(`[API Network Error] ${url}:`, error);
      return {
        success: false,
        status: 0,
        error: {
          code: "NETWORK_ERROR",
          message: "ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.",
        },
      };
    }
  }

  get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET", headers });
  }

  post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE", headers });
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
          status: 401,
          error: {
            code: errBody.error?.code || "UNAUTHORIZED",
            message:
              errBody.error?.message ||
              "نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.",
          },
        };
      }

      if (!(response.headers.get("content-type") || "").includes("application/json")) {
        await response.text().catch(() => "");
        return {
          success: false,
          status: response.status,
          error: {
            code: response.status >= 500 ? "SERVER_UNAVAILABLE" : "SERVER_ERROR",
            message:
              response.status >= 500
                ? "سرور موقتاً در دسترس نیست. لطفاً چند لحظه بعد دوباره تلاش کنید."
                : "خطا در پردازش سرور هنگام بارگذاری فایل.",
          },
        };
      }

      const parsed = await response.json().catch(() => null);
      if (parsed && typeof parsed === "object") {
        return {
          ...parsed,
          status: response.status,
        };
      }

      return {
        success: false,
        status: response.status,
        error: {
          code: "SERVER_ERROR",
          message: "خطا در پردازش سرور هنگام بارگذاری فایل.",
        },
      };
    } catch (error) {
      console.error(`[Upload Network Error] ${url}:`, error);
      return {
        success: false,
        status: 0,
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
