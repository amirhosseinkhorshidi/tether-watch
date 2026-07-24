import "dotenv/config";
import { z } from "zod";

/**
 * Typed, validated configuration — replaces the scattered `os.getenv(...)` calls
 * and `python-dotenv` from the Python version. Fails fast if a required var is missing.
 */
const EnvSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  CHANNEL_ID: z.string().min(1, "CHANNEL_ID is required"),
  ADMIN_ID: z.coerce.number().int(),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_DB: z.coerce.number().int().default(0),

  WEBHOOK_URL: z.string().url(),
  WEBHOOK_PATH: z.string().min(1),
  WEBAPP_HOST: z.string().default("127.0.0.3"),
  WEBAPP_PORT: z.coerce.number().int().default(8443),

  API_BASE_URL: z.string().url().default("https://api.bitpin.org/api/v1/mkt/tickers/"),

  REDIS_UPDATE_INTERVAL_MINUTES: z.coerce.number().int().default(14),
  CHANNEL_SEND_INTERVAL_MINUTES: z.coerce.number().int().default(15),
  REDIS_EXPIRY_MINUTES: z.coerce.number().int().default(30),

  TIMEZONE: z.string().default("Asia/Tehran"),
  ENABLE_LOGGING: z.string().default("true"),
});

const env = EnvSchema.parse(process.env);

// Fastify needs the route to start with "/"; normalize once here.
const webhookPath = env.WEBHOOK_PATH.startsWith("/") ? env.WEBHOOK_PATH : `/${env.WEBHOOK_PATH}`;

export const config = {
  botToken: env.BOT_TOKEN,
  channelId: env.CHANNEL_ID,
  adminId: env.ADMIN_ID,
  channelUrl: "https://t.me/TetherWatch",

  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    db: env.REDIS_DB,
  },

  webhook: {
    url: env.WEBHOOK_URL,
    path: webhookPath,
    host: env.WEBAPP_HOST,
    port: env.WEBAPP_PORT,
  },

  apiBaseUrl: env.API_BASE_URL,

  redisExpiryMinutes: env.REDIS_EXPIRY_MINUTES,

  timezone: env.TIMEZONE,
  enableLogging: env.ENABLE_LOGGING.toLowerCase() === "true",
} as const;

export type Config = typeof config;
