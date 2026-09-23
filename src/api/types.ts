/** Exchanges the bot can read the USDT/Toman price from (selected via `PRICE_PROVIDER`). */
export const PRICE_PROVIDERS = ["bitpin", "wallex"] as const;

export type PriceProvider = (typeof PRICE_PROVIDERS)[number];

/**
 * Exchange-agnostic USDT/Toman ticker. Every provider client maps its own
 * response shape into this, so the bot, scheduler and cache never depend on
 * a specific exchange's field names.
 */
export interface Ticker {
  source: PriceProvider;
  /** The exchange's own market symbol, e.g. `USDT_IRT` (Bitpin) or `USDTTMN` (Wallex). */
  symbol: string;
  /** Last price, in Toman. */
  price: number;
  /** 24h high, in Toman. */
  high: number;
  /** 24h low, in Toman. */
  low: number;
  /** 24h change in percent, e.g. `-0.79` means −0.79%. */
  changePercent: number;
}
