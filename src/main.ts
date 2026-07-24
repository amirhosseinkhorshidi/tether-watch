import Fastify from "fastify";
import { webhookCallback } from "grammy";
import { bot } from "./bot/bot.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { startScheduler, stopScheduler, updatePriceInRedis } from "./scheduler/jobs.js";
import { closeRedis } from "./utils/redis.js";

/**
 * Entry point — webhook run mode (port of the `else` branch of `main()` in bot.py).
 * Sets the webhook, serves it via Fastify, then kicks off the scheduler.
 */
async function main(): Promise<void> {
  logger.info("Starting bot...");

  // Fetch and cache bot info (username, inline support, ...).
  try {
    await bot.init();
    logger.info(
      `Bot info: ${bot.botInfo.username}, supports inline queries: ${bot.botInfo.supports_inline_queries}`,
    );
  } catch (error) {
    logger.error({ err: error }, "Error getting bot info");
  }

  const webhookUrl = `${config.webhook.url}${config.webhook.path}`;
  await bot.api.setWebhook(webhookUrl, { drop_pending_updates: true });
  logger.info(`Webhook set to ${webhookUrl}`);

  const server = Fastify();
  server.post(config.webhook.path, webhookCallback(bot, "fastify"));

  await server.listen({ host: config.webhook.host, port: config.webhook.port });
  logger.info(`Bot started on ${config.webhook.host}:${config.webhook.port}`);

  // on_startup: seed Redis immediately, then schedule the recurring jobs.
  await updatePriceInRedis();
  startScheduler();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down...`);
    stopScheduler();
    await server.close();
    await closeRedis();
    logger.info("Bot stopped");
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error({ err: error }, "Fatal error during startup");
  process.exit(1);
});
