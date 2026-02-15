/**
 * Persistent rate limiter backed by Supabase
 * Falls back to in-memory if Supabase is unavailable
 * 
 * Uses the check_rate_limit RPC function in Supabase which:
 * 1. Cleans up expired entries for the key
 * 2. Counts current entries in the window
 * 3. Atomically inserts a new entry if under the limit
 * 4. Returns { allowed: boolean, current: number, limit: number }
 */

import { supabase } from "./supabase";

// ─── In-memory fallback (used if Supabase call fails) ───
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old in-memory entries periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

function inMemoryRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: config.limit - 1,
      resetIn: config.windowSeconds,
    };
  }

  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

// ─── Public types ───
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;
}

/**
 * Check if a request should be rate limited (persistent via Supabase)
 * Falls back to in-memory if Supabase is unavailable
 * @param identifier - Unique identifier (usually IP address or user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: identifier,
      p_window_seconds: config.windowSeconds,
      p_max_requests: config.limit,
    });

    if (error || !data) {
      // Supabase unavailable — fall back to in-memory
      console.warn("[RateLimit] Supabase RPC failed, using in-memory fallback:", error?.message);
      return inMemoryRateLimit(identifier, config);
    }

    const result = data as { allowed: boolean; current: number; limit: number };
    return {
      success: result.allowed,
      remaining: Math.max(0, result.limit - result.current),
      resetIn: config.windowSeconds,
    };
  } catch (err) {
    // Network error or other failure — fall back to in-memory
    console.warn("[RateLimit] Exception, using in-memory fallback:", err);
    return inMemoryRateLimit(identifier, config);
  }
}

/**
 * Synchronous in-memory rate limit (for code paths that can't be async)
 * Use this only when you absolutely cannot use the async version
 */
export function rateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return inMemoryRateLimit(identifier, config);
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return "unknown";
}

// Pre-configured rate limiters for different use cases
export const RATE_LIMITS = {
  // Strict: For sensitive operations (login, signup, password reset)
  strict: { limit: 5, windowSeconds: 60 },
  
  // Standard: For regular API calls
  standard: { limit: 30, windowSeconds: 60 },
  
  // Relaxed: For read-heavy operations
  relaxed: { limit: 100, windowSeconds: 60 },
  
  // AI: For AI/LLM calls (expensive)
  ai: { limit: 10, windowSeconds: 60 },
};
