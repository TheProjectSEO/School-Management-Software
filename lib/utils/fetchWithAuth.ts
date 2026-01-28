/**
 * Fetch wrapper that automatically handles token refresh
 * When receiving a 401 with TOKEN_EXPIRED code, it will:
 * 1. Call the refresh endpoint to get new tokens
 * 2. Retry the original request
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Refresh the access token by calling the refresh endpoint
 */
async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      return true;
    }

    // Refresh failed - user needs to log in again
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}

/**
 * Ensure only one refresh request is in flight at a time
 */
async function ensureRefreshed(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = refreshToken().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Fetch with automatic token refresh
 * Use this instead of regular fetch() for authenticated API calls
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Always include credentials for cookie-based auth
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
  };

  const response = await fetch(url, fetchOptions);

  // If we get a 401, check if it's a token expiration
  if (response.status === 401) {
    try {
      // Clone the response to read the body (can only read once)
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();

      if (data.code === 'TOKEN_EXPIRED') {
        // Try to refresh the token
        const refreshed = await ensureRefreshed();

        if (refreshed) {
          // Retry the original request
          return fetch(url, fetchOptions);
        }

        // Refresh failed - redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
      }
    } catch {
      // Couldn't parse response as JSON, return original response
    }
  }

  return response;
}

/**
 * Helper to make JSON API calls with automatic token refresh
 */
export async function apiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const response = await fetchWithAuth(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: data.error || data.message || 'Request failed',
        status: response.status,
      };
    }

    return { data, error: null, status: response.status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}
