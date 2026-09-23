import { Redis } from "ioredis";
import { config } from "../config.js";

/**
 * Thin JSON cache over ioredis — the direct counterpart of `RedisClient` in
 * `src/utils/redis_client.py`.
 */
const client = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  db: config.redis.db,
  password: config.redis.password,
  keyPrefix: config.redis.prefix ? `${config.redis.prefix}:` : undefined,
  lazyConnect: false,
});

export async function setCache(
  key: string,
  value: unknown,
  expirySeconds: number = config.redis.defaultTimeout,
): Promise<void> {
  const payload = JSON.stringify(value);
  if (expirySeconds) {
    await client.set(key, payload, "EX", expirySeconds);
  } else {
    await client.set(key, payload);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const value = await client.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

export async function delCache(key: string): Promise<void> {
  await client.del(key);
}

export async function closeRedis(): Promise<void> {
  await client.quit();
}
