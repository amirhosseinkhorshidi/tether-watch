import { Bot } from "grammy";
import { config } from "../config.js";
import { setupHandlers } from "./handlers.js";

/** The shared bot instance. Handlers are attached once at import time. */
export const bot = new Bot(config.botToken);

setupHandlers(bot);
