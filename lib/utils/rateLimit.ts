/**
 * In-memory sliding-window rate limiter.
 *
 * Works per Vercel serverless function instance. Supabase Auth provides a
 * second rate-limit layer server-side, so this is defense-in-depth.
 *
 * Usage:
 *   const result = checkRateLimit('login:user@example.com', 5, 15 * 60 * 1000)
 *   if (!result.allowed) return new Response('Too many requests', { status: 429 })
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// Periodically prune expired entries to prevent memory growth
// (runs at most once per 5 minutes across all invocations)
let lastPruned = 0;
function maybePrune() {
  const now = Date.now();
  if (now - lastPruned < 5 * 60 * 1000) return;
  lastPruned = now;
  for (const [key, record] of store.entries()) {
    if (now > record.resetAt) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * @param key        Unique identifier for the rate-limit bucket (e.g. "login:ip:email")
 * @param max        Maximum requests allowed within the window
 * @param windowMs   Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  maybePrune();
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }

  if (record.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: record.resetAt - now,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: max - record.count,
    retryAfterMs: 0,
  };
}

/** Helper: extract best-effort IP from Next.js request headers */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Returns a 429 NextResponse with Retry-After header */
export function rateLimitResponse(retryAfterMs: number): Response {
  const retryAfterSecs = Math.ceil(retryAfterMs / 1000);
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSecs),
      },
    }
  );
}
