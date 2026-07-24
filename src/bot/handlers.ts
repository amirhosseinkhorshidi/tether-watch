import { type Bot, InlineKeyboard, InlineQueryResultBuilder } from "grammy";
import { type Ticker, formatCombinedMessage, getUsdtPrice } from "../api/bitpin.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { sendPriceToChannel } from "../scheduler/jobs.js";
import { formatNumber, formatTehranTime, getTehranParts } from "../utils/format.js";
import { getCache } from "../utils/redis.js";

/** Shape stored in Redis under `current_price` (see scheduler/jobs.ts). */
interface CachedPrice {
  ticker: Ticker;
  timestamp: number;
  scheduled_time?: string;
}

const INTRO_TEXT =
  'هر <b>15 دقیقه</b> <b>قیمت لحظه‌ای</b> <b>USDT</b> از <b>صرافی‌های معتبر ایرانی</b> دریافت و نمایش داده می‌شود. جهت نمایش قیمت می‌توانید از دکمه "<b>دریافت قیمت لحظه‌ای</b>" استفاده کنید.';

/** Load the ticker from Redis, or fall back to a fresh API fetch. */
async function loadTicker(): Promise<Ticker> {
  const cached = await getCache<CachedPrice>("current_price");
  if (cached) {
    logger.info("Using cached price from Redis");
    return cached.ticker;
  }
  logger.info("Fetched fresh price from API");
  return getUsdtPrice();
}

/**
 * Intro menu keyboard. The admin additionally gets a "send price to channel"
 * button underneath the "get price" button.
 */
function buildIntroKeyboard(userId?: number): InlineKeyboard {
  const keyboard = new InlineKeyboard().text("دریافت قیمت لحظه ای", "get_price");
  if (userId !== undefined && userId === config.adminId) {
    keyboard.row().text("ارسال قیمت به کانال", "send_to_channel");
  }
  return keyboard;
}

export function setupHandlers(bot: Bot): void {
  bot.command("start", async (ctx) => {
    logger.info(`Start command from user ${ctx.from?.id}`);
    const keyboard = buildIntroKeyboard(ctx.from?.id);
    await ctx.reply(INTRO_TEXT, { parse_mode: "HTML", reply_markup: keyboard });
  });

  bot.callbackQuery("get_price", async (ctx) => {
    logger.info(`Get price callback from user ${ctx.from?.id}`);
    try {
      const ticker = await loadTicker();
      const text = formatCombinedMessage(ticker);
      const keyboard = new InlineKeyboard()
        .text("اپدیت", "update_price")
        .row()
        .text("بازگشت", "back");
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } catch (error) {
      logger.error({ err: error }, "Error in get_price");
      await ctx.editMessageText("خطا در دریافت قیمت.");
    }
  });

  bot.callbackQuery("update_price", async (ctx) => {
    const userId = ctx.from?.id;
    logger.info(`Update price callback from user ${userId}`);
    try {
      const ticker = await loadTicker();
      const text = formatCombinedMessage(ticker);
      const keyboard = new InlineKeyboard()
        .text("اپدیت", "update_price")
        .row()
        .text("بازگشت", "back");

      // Avoid Telegram's "message is not modified" error: only edit when changed.
      const currentText = ctx.callbackQuery.message?.text;
      if (currentText !== text) {
        await ctx.editMessageText(text, { reply_markup: keyboard });
        logger.info(`Price updated for user ${userId}`);
      } else {
        // Compute time remaining until the next :00/:15/:30/:45 slot.
        const { minute, second } = getTehranParts();
        const currentSlot = Math.floor(minute / 15);
        const nextSlot = (currentSlot + 1) % 4;
        const targetMinute = nextSlot * 15;

        const minutesUntilUpdate = nextSlot === 0 ? 60 - minute : targetMinute - minute;
        const totalSecondsUntilUpdate = minutesUntilUpdate * 60 - second;
        const minutesRemaining = Math.floor(totalSecondsUntilUpdate / 60);
        const secondsRemaining = totalSecondsUntilUpdate % 60;

        await ctx.answerCallbackQuery({
          text: `⏰ ${minutesRemaining} دقیقه و ${secondsRemaining} ثانیه تا آپدیت قیمت`,
          show_alert: true,
        });
        logger.info(`No price change for user ${userId}`);
      }
    } catch (error) {
      logger.error({ err: error }, "Error in update_price");
      await ctx.editMessageText("خطا در بروزرسانی قیمت.");
    }
  });

  bot.callbackQuery("back", async (ctx) => {
    logger.info(`Back callback from user ${ctx.from?.id}`);
    const keyboard = buildIntroKeyboard(ctx.from?.id);
    await ctx.editMessageText(INTRO_TEXT, { parse_mode: "HTML", reply_markup: keyboard });
  });

  // Admin-only: push the current price to the channel on demand.
  bot.callbackQuery("send_to_channel", async (ctx) => {
    if (ctx.from?.id !== config.adminId) {
      await ctx.answerCallbackQuery({ text: "⛔️ این دکمه فقط برای ادمین است.", show_alert: true });
      return;
    }
    try {
      await sendPriceToChannel();
      await ctx.answerCallbackQuery({
        text: "✅ قیمت با موفقیت به کانال ارسال شد",
        show_alert: true,
      });
      logger.info(`Admin ${ctx.from.id} sent price to channel`);
    } catch (error) {
      logger.error({ err: error }, "Error in send_to_channel");
      await ctx.answerCallbackQuery({ text: "❌ خطا در ارسال قیمت به کانال", show_alert: true });
    }
  });

  bot.on("inline_query", async (ctx) => {
    logger.info(`Inline query received: ${ctx.inlineQuery.query} from user ${ctx.from?.id}`);
    try {
      const cached = await getCache<CachedPrice>("current_price");
      const ticker = cached ? cached.ticker : await getUsdtPrice();
      const displayTime = cached?.scheduled_time ?? formatTehranTime();

      const priceDisplay = formatNumber(ticker.price);
      const highDisplay = formatNumber(ticker.high);
      const lowDisplay = formatNumber(ticker.low);
      const changePercent = ticker.daily_change_price;
      const direction = changePercent > 0 ? "افزایشی" : "کاهشی";
      const changeAbs = Math.abs(changePercent).toFixed(2);

      const usdtDescription = `💵 قیمت تتر: ${priceDisplay} تومان`;
      const usdtMessage = `💵 قیمت تتر: ${priceDisplay} تومان

⬆️ بالاترین قیمت: ${highDisplay} تومان
⬇️ پایین‌ترین قیمت: ${lowDisplay} تومان

📊 درصد تغییرات امروز: ${changeAbs}% ${direction}

🕒 آخرین به‌روزرسانی: ${displayTime}`;

      const keyboard = new InlineKeyboard().url("عضویت در کانال", config.channelUrl);
      const result = InlineQueryResultBuilder.article("1", "ارسال قیمت لحظه‌ای تتر", {
        description: usdtDescription,
        reply_markup: keyboard,
      }).text(usdtMessage);

      await ctx.answerInlineQuery([result]);
      logger.info("Inline query answered successfully with 1 result");
    } catch (error) {
      logger.error({ err: error }, "Error in inline query handler");
      await ctx.answerInlineQuery([]);
    }
  });

  // Catch-all logger for any other message — registered last so it never
  // shadows the command/callback handlers above.
  bot.on("message", (ctx) => {
    logger.info(`Received message: ${ctx.message.text} from user ${ctx.from?.id}`);
  });
}
