import { z } from "zod";
import { config } from "../config.js";
import { formatNumber, formatTehranTime } from "../utils/format.js";

/**
 * Bitpin ticker client + message formatting — the port of `src/api/bitpin.py`.
 * Numeric fields are coerced (the API returns them as strings) and validated
 * with zod so a shape change surfaces a clean error instead of a runtime crash.
 */
const TickerSchema = z
  .object({
    symbol: z.string(),
    price: z.coerce.number(),
    high: z.coerce.number(),
    low: z.coerce.number(),
    daily_change_price: z.coerce.number(),
    timestamp: z.coerce.number().optional(),
  })
  .passthrough();

const TickersSchema = z.array(TickerSchema);

export type Ticker = z.infer<typeof TickerSchema>;

export async function getTickers(): Promise<Ticker[]> {
  const response = await fetch(config.apiBaseUrl);
  if (!response.ok) {
    throw new Error(`Bitpin API error: ${response.status} ${response.statusText}`);
  }
  const data: unknown = await response.json();
  return TickersSchema.parse(data);
}

export async function getUsdtPrice(): Promise<Ticker> {
  const tickers = await getTickers();
  const usdt = tickers.find((ticker) => ticker.symbol === "USDT_IRT");
  if (!usdt) {
    throw new Error("USDT_IRT not found in tickers");
  }
  return usdt;
}

/**
 * Faithful port of `format_combined_message`. When `scheduledTime` is omitted it
 * falls back to the current wall-clock time in the configured timezone.
 */
export function formatCombinedMessage(ticker: Ticker, scheduledTime?: string): string {
  const price = formatNumber(ticker.price);
  const high = formatNumber(ticker.high);
  const low = formatNumber(ticker.low);

  const changePercent = ticker.daily_change_price;
  const direction = changePercent > 0 ? "افزایشی" : "کاهشی";
  const changeAbs = Math.abs(changePercent).toFixed(2);

  const displayTime = scheduledTime ?? formatTehranTime();

  return `💵 قیمت تتر: ${price} تومان

⬆️ بالاترین قیمت: ${high} تومان
⬇️ پایین‌ترین قیمت: ${low} تومان
📊 درصد تغییرات امروز: ${changeAbs}% ${direction}

🕒 آخرین به‌روزرسانی: ${displayTime}`;
}
