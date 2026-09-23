import { z } from "zod";
import { config } from "../config.js";
import { fetchJson } from "./http.js";
import type { Ticker } from "./types.js";

/**
 * Bitpin ticker client. `GET /api/v1/mkt/tickers/` returns every market;
 * numeric fields arrive as strings, so they are coerced and validated with
 * zod — a shape change surfaces as a clean error instead of a runtime crash.
 */
const SYMBOL = "USDT_IRT";

// Only `symbol` is checked across the whole list; the full shape is validated
// on the one entry we use, so an odd unrelated market can't break the parse.
const TickersSchema = z.array(z.object({ symbol: z.string() }).passthrough());

const TickerSchema = z.object({
  symbol: z.string(),
  price: z.coerce.number(),
  high: z.coerce.number(),
  low: z.coerce.number(),
  daily_change_price: z.coerce.number(),
});

export async function getBitpinUsdtTicker(): Promise<Ticker> {
  const tickers = TickersSchema.parse(await fetchJson(config.priceApi.bitpinUrl, "Bitpin"));
  const raw = tickers.find((ticker) => ticker.symbol === SYMBOL);
  if (!raw) {
    throw new Error(`${SYMBOL} not found in Bitpin tickers`);
  }
  const ticker = TickerSchema.parse(raw);
  return {
    source: "bitpin",
    symbol: ticker.symbol,
    price: ticker.price,
    high: ticker.high,
    low: ticker.low,
    changePercent: ticker.daily_change_price,
  };
}
