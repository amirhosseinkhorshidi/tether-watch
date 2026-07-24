import { pino } from "pino";
import { config } from "./config.js";

/**
 * Structured logger — replaces Python's `logging`.
 * Level mirrors the `ENABLE_LOGGING` toggle (info when on, warn when off).
 */
export const logger = pino({
  level: config.enableLogging ? "info" : "warn",
});
