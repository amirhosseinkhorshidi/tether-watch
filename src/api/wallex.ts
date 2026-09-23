import { z } from "zod";
import { config } from "../config.js";
import { fetchJson } from "./http.js";
import type { Ticker } from "./types.js";

/**
 * Wallex market client — https://developers.wallex.ir/docs/basic-services-markets
 * `GET /hector/web/v1/markets` is public (no `x-api-key`) and returns every
 * market under `result.markets`. Prices are strings, in Toman for TMN markets.
 */
const SYMBOL = "USDTTMN";

const MarketsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  result: z.object({
    markets: z.array(z.object({ symbol: z.string() }).passthrough()),
  }),
});

// `highest_24h_price` / `lowest_24h_price` are present in the live response
// but not listed in Wallex's docs; if they ever disappear, parsing fails loudly.
const MarketSchema = z.object({
  symbol: z.string(),
  price: z.coerce.number(),
  highest_24h_price: z.coerce.number(),
  lowest_24h_price: z.coerce.number(),
  change_24h: z.coerce.number(),
});

export async function getWallexUsdtTicker(): Promise<Ticker> {
  const body = MarketsResponseSchema.parse(await fetchJson(config.priceApi.wallexUrl, "Wallex"));
  if (!body.success) {
    throw new Error(`Wallex API error: ${body.message ?? "success=false"}`);
  }
  const raw = body.result.markets.find((market) => market.symbol === SYMBOL);
  if (!raw) {
    throw new Error(`${SYMBOL} not found in Wallex markets`);
  }
  const market = MarketSchema.parse(raw);
  return {
    source: "wallex",
    symbol: market.symbol,
    price: market.price,
    high: market.highest_24h_price,
    low: market.lowest_24h_price,
    changePercent: market.change_24h,
  };
}
