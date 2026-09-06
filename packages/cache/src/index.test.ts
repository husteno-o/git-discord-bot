import { describe, expect, it } from "vitest";
import { MemoryCacheProvider, getOrSet } from "./index.js";

describe("MemoryCacheProvider", () => {
  it("stores and retrieves values with TTL", async () => {
    const cache = new MemoryCacheProvider();
    await cache.set("foo", { bar: 123 }, 60);

    const val = await cache.get<{ bar: number }>("foo");
    expect(val).toEqual({ bar: 123 });

    await cache.del("foo");
    const missing = await cache.get("foo");
    expect(missing).toBeNull();
  });

  it("handles distributed lock acquisition and release", async () => {
    const cache = new MemoryCacheProvider();
    const acquired1 = await cache.acquireLock("job-1", 10);
    expect(acquired1).toBe(true);

    const acquired2 = await cache.acquireLock("job-1", 10);
    expect(acquired2).toBe(false);

    await cache.releaseLock("job-1");
    const acquired3 = await cache.acquireLock("job-1", 10);
    expect(acquired3).toBe(true);
  });

  it("enforces rate limits correctly", async () => {
    const cache = new MemoryCacheProvider();
    const res1 = await cache.checkRateLimit("user:1", 2, 5);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = await cache.checkRateLimit("user:1", 2, 5);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(0);

    const res3 = await cache.checkRateLimit("user:1", 2, 5);
    expect(res3.allowed).toBe(false);
    expect(res3.remaining).toBe(0);
    expect(res3.resetSeconds).toBeGreaterThan(0);
  });

  it("works with getOrSet helper", async () => {
    const cache = new MemoryCacheProvider();
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return "computed-val";
    };

    const val1 = await getOrSet("cache-key", fetcher, 60, cache);
    expect(val1).toBe("computed-val");
    expect(calls).toBe(1);

    const val2 = await getOrSet("cache-key", fetcher, 60, cache);
    expect(val2).toBe("computed-val");
    expect(calls).toBe(1); // Not called again
  });
});
