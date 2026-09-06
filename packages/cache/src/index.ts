import { config } from "@devpulse/config";
import { logger } from "@devpulse/logger";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  acquireLock(key: string, ttlSeconds: number): Promise<boolean>;
  releaseLock(key: string): Promise<void>;
  checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

export class MemoryCacheProvider implements CacheProvider {
  private store = new Map<string, { value: any; expiresAt?: number }>();
  private rateLimits = new Map<string, { count: number; resetAt: number }>();
  private locks = new Set<string>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
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
    } catch (err) {
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
    } catch (err) {
      logger.warn({ err, key }, "Upstash Redis SET failed");
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
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
    } catch (err) {
      logger.warn({ err, key }, "Upstash Redis acquireLock failed");
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    try {
      await this.redis.del(`lock:${key}`);
    } catch (err) {
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
    } catch (err) {
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
