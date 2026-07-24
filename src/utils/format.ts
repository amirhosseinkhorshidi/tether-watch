import { config } from "../config.js";

/**
 * Formatting helpers built on the native `Intl` API — this is what replaces
 * `pytz`, Python's `strftime('%H:%M')`, and the `{value:,}` thousands separator.
 * Zero external dependencies.
 */

/** `{value:,}` equivalent: group with commas and truncate like Python's `int()`. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.trunc(value));
}

/** `datetime.now(tz).strftime('%H:%M')` equivalent, in the configured timezone. */
export function formatTehranTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: config.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** Wall-clock hour/minute/second in the configured timezone (for the countdown logic). */
export function getTehranParts(date: Date = new Date()): {
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: config.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return { hour: get("hour"), minute: get("minute"), second: get("second") };
}
