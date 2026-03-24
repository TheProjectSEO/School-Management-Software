/**
 * Authenticated fetch wrapper
 * Automatically refreshes the access token on 401 TOKEN_EXPIRED and retries the request.
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (response.ok) return true;

    // On failure, wait 700ms and retry once.
    // This handles the multi-tab rotation race: another tab may have just
    // refreshed and placed a new valid refresh token in the shared cookies.
    await new Promise((r) => setTimeout(r, 700));
    const retry = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return retry.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch with automatic token refresh on 401.
 * Drop-in replacement for `fetch()` — same signature.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const options: RequestInit = { ...init, credentials: 'include' };

  const response = await fetch(input, options);

  if (response.status !== 401) {
    return response;
  }

  // Check if the 401 is a token expiry (not a permission issue)
  const cloned = response.clone();
  try {
    const body = await cloned.json();
    if (body?.code !== 'TOKEN_EXPIRED') {
      return response;
    }
  } catch {
    return response;
  }

  // Deduplicate concurrent refresh calls
  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = refreshToken().finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });
  }

  const refreshed = await (refreshPromise ?? refreshToken());

  if (!refreshed) {
    // Refresh failed — redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return response;
  }

  // Retry the original request with new cookies
  return fetch(input, options);
}
