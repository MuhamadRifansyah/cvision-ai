type Entry = { count: number; resetAt: number };

const attempts = new Map<string, Entry>();
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 8;

/** Replace with Redis/Upstash in multi-instance deployments. */
export function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  if (entry.count > LIMIT) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
