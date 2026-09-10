import { config } from "@devpulse/config";
import { logger } from "@devpulse/logger";
import { Redis } from "@upstash/redis";

/** Result of a rate limit check. */
export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Seconds until the rate limit window resets. */
  resetSeconds: number;
}

/**
 * Abstraction for cache providers (Redis, in-memory, etc.).
 * Supports basic CRUD, distributed locks, and rate limiting.
 */
export interface CacheProvider {
  /** Retrieve a value from cache by key. Returns null if not found or expired. */
  get<T>(key: string): Promise<T | null>;
  /** Store a value in cache with optional TTL in seconds. */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /** Delete a value from cache by key. */
  del(key: string): Promise<void>;
  /** Acquire a distributed lock with a TTL. Returns true if lock was acquired. */
  acquireLock(key: string, ttlSeconds: number): Promise<boolean>;
  /** Release a previously acquired distributed lock. */
  releaseLock(key: string): Promise<void>;
  /** Check if a request is within the rate limit window. */
  checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

export class MemoryCacheProvider implements CacheProvider {
  private store = new Map<string, { value: unknown; expiresAt?: number; lastAccess: number }>();
  private rateLimits = new Map<string, { count: number; resetAt: number }>();
  private locks = new Set<string>();
  private readonly MAX_ENTRIES = 2000;
  private readonly CLEANUP_INTERVAL = 60_000;
  private lastCleanup = Date.now();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    item.lastAccess = Date.now();
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt, lastAccess: Date.now() });
    this.maybeEvict();
    this.maybeCleanup();
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  private maybeEvict(): void {
    if (this.store.size <= this.MAX_ENTRIES) return;
    const entries = Array.from(this.store.entries());
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    const toRemove = entries.slice(0, Math.ceil(this.store.size * 0.2));
    for (const [key] of toRemove) {
      this.store.delete(key);
    }
    logger.debug({ evicted: toRemove.length, remaining: this.store.size }, "Cache LRU eviction");
  }

  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) return;
    this.lastCleanup = now;
    for (const [key, item] of this.store) {
      if (item.expiresAt && now > item.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const lockKey = `lock:${key}`;
    if (this.locks.has(lockKey)) {
      return false;
    }
    this.locks.add(lockKey);
    setTimeout(() => {
      this.locks.delete(lockKey);
    }, ttlSeconds * 1000).unref?.();
    return true;
  }

  async releaseLock(key: string): Promise<void> {
    this.locks.delete(`lock:${key}`);
  }

  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const current = this.rateLimits.get(key);

    if (!current || now >= current.resetAt) {
      this.rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: limit - 1,
        resetSeconds: windowSeconds,
      };
    }

    if (current.count >= limit) {
      const resetSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        resetSeconds,
      };
    }

    current.count += 1;
    const resetSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return {
      allowed: true,
      remaining: limit - current.count,
      resetSeconds,
    };
  }
}

export class UpstashRedisProvider implements CacheProvider {
  private redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const res = await this.redis.get<T>(key);
      return res ?? null;
    } catch (err: unknown) {
      logger.warn({ err, key }, "Upstash Redis GET failed, returning null");
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.redis.set(key, value, { ex: ttlSeconds });
      } else {
        await this.redis.set(key, value);
      }
    } catch (err: unknown) {
      logger.warn({ err, key }, "Upstash Redis SET failed");
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err: unknown) {
      logger.warn({ err, key }, "Upstash Redis DEL failed");
    }
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const lockKey = `lock:${key}`;
      const result = await this.redis.set(lockKey, "locked", {
        nx: true,
        ex: ttlSeconds,
      });
      return result === "OK";
    } catch (err: unknown) {
      logger.warn({ err, key }, "Upstash Redis acquireLock failed");
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    try {
      await this.redis.del(`lock:${key}`);
    } catch (err: unknown) {
      logger.warn({ err, key }, "Upstash Redis releaseLock failed");
    }
  }

  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    try {
      const rateLimitKey = `ratelimit:${key}`;
      const count = await this.redis.incr(rateLimitKey);
      if (count === 1) {
        await this.redis.expire(rateLimitKey, windowSeconds);
      }
      const ttl = await this.redis.ttl(rateLimitKey);
      const resetSeconds = ttl > 0 ? ttl : windowSeconds;

      if (count > limit) {
        return {
          allowed: false,
          remaining: 0,
          resetSeconds,
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, limit - count),
        resetSeconds,
      };
    } catch (err: unknown) {
      logger.warn({ err, key }, "Upstash Redis checkRateLimit failed, allowing request by default");
      return { allowed: true, remaining: 1, resetSeconds: 1 };
    }
  }
}

let providerInstance: CacheProvider | null = null;

function isValidUpstashConfig(url?: string, token?: string): boolean {
  if (!url || !token) return false;
  if (
    url.includes("your-upstash-instance") ||
    url.includes("mock-redis") ||
    url.includes("example.com")
  ) {
    return false;
  }
  if (
    token.includes("your_upstash_rest_token") ||
    token.includes("mock_token") ||
    token === "placeholder"
  ) {
    return false;
  }
  return true;
}

export function getCacheProvider(): CacheProvider {
  if (providerInstance) return providerInstance;

  if (isValidUpstashConfig(config.UPSTASH_REDIS_REST_URL, config.UPSTASH_REDIS_REST_TOKEN)) {
    logger.info("Using Upstash Redis cache provider");
    providerInstance = new UpstashRedisProvider(
      config.UPSTASH_REDIS_REST_URL!,
      config.UPSTASH_REDIS_REST_TOKEN!,
    );
  } else {
    logger.info("Using in-memory cache provider (no Upstash Redis configured)");
    providerInstance = new MemoryCacheProvider();
  }

  return providerInstance;
}

export const cache = getCacheProvider();

/**
 * Retrieves a cached value or fetches and caches it on cache miss.
 * Implements cache-aside pattern with the configured provider.
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
  provider: CacheProvider = cache,
): Promise<T> {
  const cached = await provider.get<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const value = await fetcher();
  await provider.set(key, value, ttlSeconds);
  return value;
}
