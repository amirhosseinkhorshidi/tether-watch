import { config } from "../config.js";
import { formatNumber, formatTehranTime } from "../utils/format.js";
import { getBitpinUsdtTicker } from "./bitpin.js";
import type { PriceProvider, Ticker } from "./types.js";
import { getWallexUsdtTicker } from "./wallex.js";

export type { Ticker } from "./types.js";

/**
 * Provider-agnostic entry point: everything outside `src/api/` goes through
 * here, and `PRICE_PROVIDER` decides which exchange is actually queried.
 */
const fetchers: Record<PriceProvider, () => Promise<Ticker>> = {
  bitpin: getBitpinUsdtTicker,
  wallex: getWallexUsdtTicker,
};

export function getUsdtPrice(): Promise<Ticker> {
  return fetchers[config.priceProvider]();
}

/**
 * Redis key for the cached price. Scoped per provider so that after switching
 * `PRICE_PROVIDER` the bot never serves the previous exchange's cached price.
 */
export const PRICE_CACHE_KEY = `current_price:${config.priceProvider}`;

/** Shape stored in Redis under `PRICE_CACHE_KEY` (written by scheduler/jobs.ts). */
export interface CachedPrice {
  ticker: Ticker;
  timestamp: number;
  scheduled_time: string;
}

/**
 * Faithful port of `format_combined_message`. When `scheduledTime` is omitted it
 * falls back to the current wall-clock time in the configured timezone.
 */
export function formatCombinedMessage(ticker: Ticker, scheduledTime?: string): string {
  const price = formatNumber(ticker.price);
  const high = formatNumber(ticker.high);
  const low = formatNumber(ticker.low);

  const changePercent = ticker.changePercent;
  const direction = changePercent > 0 ? "افزایشی" : "کاهشی";
  const changeAbs = Math.abs(changePercent).toFixed(2);

  const displayTime = scheduledTime ?? formatTehranTime();

  return `💵 قیمت تتر: ${price} تومان

⬆️ بالاترین قیمت: ${high} تومان
⬇️ پایین‌ترین قیمت: ${low} تومان
📊 درصد تغییرات امروز: ${changeAbs}% ${direction}

🕒 آخرین به‌روزرسانی: ${displayTime}`;
}
