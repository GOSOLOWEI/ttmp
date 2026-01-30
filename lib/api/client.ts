// 统一的 API 客户端

import type { ApiResponse } from "@/lib/types/manage";

/**
 * 统一的 API 请求函数
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `请求失败: ${response.statusText}`,
      };
    }

    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "网络请求失败";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * GET 请求
 */
export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { method: "GET" });
}

/**
 * POST 请求
 */
export async function apiPost<T>(
  url: string,
  body: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * PUT 请求
 */
export async function apiPut<T>(
  url: string,
  body: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * DELETE 请求
 */
export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { method: "DELETE" });
}
