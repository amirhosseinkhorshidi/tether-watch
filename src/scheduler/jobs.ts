import { Cron } from "croner";
import { type Ticker, formatCombinedMessage, getUsdtPrice } from "../api/bitpin.js";
import { bot } from "../bot/bot.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { formatTehranTime } from "../utils/format.js";
import { getCache, setCache } from "../utils/redis.js";

interface CachedPrice {
  ticker: Ticker;
  timestamp: number;
  scheduled_time: string;
}

/** Fetch the USDT price and cache it in Redis (port of `update_price_in_redis`). */
export async function updatePriceInRedis(): Promise<void> {
  try {
    const usdtTicker = await getUsdtPrice();
    const now = new Date();
    const scheduledTime = formatTehranTime(now);

    const priceData: CachedPrice = {
      ticker: usdtTicker,
      timestamp: now.getTime() / 1000, // epoch seconds, like Python's .timestamp()
      scheduled_time: scheduledTime,
    };

    await setCache("current_price", priceData, config.redisExpiryMinutes * 60);
    logger.info(
      `Price updated in Redis at ${scheduledTime} (expires in ${config.redisExpiryMinutes} minutes)`,
    );
  } catch (error) {
    logger.error({ err: error }, "Error updating price in Redis");
  }
}

/**
 * Post the cached (or fresh) price to the channel (port of `send_price_to_channel`).
 * No inline keyboard — channel posts have the "join channel" button removed.
 * Throws on failure so callers (e.g. the admin button) can report success/error.
 */
export async function sendPriceToChannel(): Promise<void> {
  const cached = await getCache<CachedPrice>("current_price");
  const ticker = cached ? cached.ticker : await getUsdtPrice();
  const scheduledTime = cached?.scheduled_time;

  const message = formatCombinedMessage(ticker, scheduledTime);

  await bot.api.sendMessage(config.channelId, message);
  logger.info("USDT price sent to channel");
}

let jobs: Cron[] = [];

/**
 * Start the cron jobs — the APScheduler replacement.
 *   - Redis update at :00, :15, :30, :45 (second 0)
 *   - Channel send 30 seconds after each of those marks (second 30)
 */
export function startScheduler(): void {
  jobs = [
    new Cron(
      "0 0,15,30,45 * * * *",
      { timezone: config.timezone, name: "update_price_redis" },
      () => updatePriceInRedis(),
    ),
    new Cron(
      "30 0,15,30,45 * * * *",
      { timezone: config.timezone, name: "send_price_channel" },
      async () => {
        try {
          await sendPriceToChannel();
        } catch (error) {
          logger.error({ err: error }, "Error sending price to channel");
        }
      },
    ),
  ];
  logger.info(
    `Scheduler started - Redis updates at :00,:15,:30,:45, Channel sends at :30 seconds, timezone: ${config.timezone}`,
  );
}

export function stopScheduler(): void {
  for (const job of jobs) {
    job.stop();
  }
  jobs = [];
}
