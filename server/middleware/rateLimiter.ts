import { TRPCError } from "@trpc/server";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMITS = {
  default: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
  auth: { maxRequests: 5, windowMs: 60000 }, // 5 auth attempts per minute
  upload: { maxRequests: 10, windowMs: 60000 }, // 10 uploads per minute
  payment: { maxRequests: 3, windowMs: 300000 }, // 3 payments per 5 minutes
};

export function rateLimiter(
  identifier: string,
  type: keyof typeof RATE_LIMITS = "default"
) {
  const limit = RATE_LIMITS[type];
  const now = Date.now();
  const key = `${type}:${identifier}`;

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs,
    });
    return;
  }

  if (entry.count >= limit.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Muitas requisições. Tente novamente em ${retryAfter} segundos.`,
    });
  }

  entry.count++;
  rateLimitStore.set(key, entry);
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 300000); // Clean every 5 minutes
