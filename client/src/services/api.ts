/**
 * Centralized API Client for The Royal Knot
 *
 * Enforces:
 * - credentials: "include" (transmits HTTP-only royal_knot_session cookie)
 * - In-memory CSRF token injection on mutating requests (POST, PUT, PATCH, DELETE)
 * - Global 401 Unauthorized handling
 * - Zero logging of sensitive credentials
 */

let memoryCsrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  memoryCsrfToken = token;
}

export function getCsrfToken(): string | null {
  return memoryCsrfToken;
}

export interface ApiFetchOptions extends RequestInit {
  skipCsrf?: boolean;
}

/**
 * Drop-in wrapper around fetch that automatically handles session credentials,
 * in-memory CSRF headers, and unauthorized redirects.
 */
export async function apiFetch(input: RequestInfo | URL, init: ApiFetchOptions = {}): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});

  // Add JSON content type if body is a string and no content-type is set
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Inject session-bound CSRF token on state-changing operations
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !init.skipCsrf) {
    if (memoryCsrfToken) {
      headers.set("X-CSRF-Token", memoryCsrfToken);
    }
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: "include" // Always send HTTP-only cookies
  });

  // Handle session expiration or unauthorized response globally
  if (response.status === 401 && typeof window !== "undefined") {
    // Only dispatch if not already calling the check-auth / me endpoint
    const url = input.toString();
    if (!url.includes("/api/auth/me") && !url.includes("/api/auth/login")) {
      window.dispatchEvent(new CustomEvent("royal-knot:unauthorized"));
    }
  }

  return response;
}

/**
 * Convenient typed helpers
 */
export const api = {
  async get<T = any>(url: string, init?: ApiFetchOptions): Promise<T> {
    const res = await apiFetch(url, { ...init, method: "GET" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async post<T = any>(url: string, body?: any, init?: ApiFetchOptions): Promise<T> {
    const res = await apiFetch(url, {
      ...init,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async patch<T = any>(url: string, body?: any, init?: ApiFetchOptions): Promise<T> {
    const res = await apiFetch(url, {
      ...init,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async delete<T = any>(url: string, init?: ApiFetchOptions): Promise<T> {
    const res = await apiFetch(url, { ...init, method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }
};
