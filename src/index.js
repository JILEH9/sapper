import "dotenv/config";
import { createApi } from "./api.js";
import { initDb, insertUpdate, upsertUser } from "./db.js";
import { SIZES, createGame, openCell, fromPacked } from "./game.js";
import { unpackOpen } from "./codec.js";
import { renderPicker, renderBoard } from "./render.js";
import {
  callbackContext,
  errDetail,
  logError,
  logInfo,
  msgContext,
  runStep,
  updateContext,
} from "./log.js";

const token = process.env.BOT_TOKEN?.trim();
const apiUrl = process.env.TELEGRAM_API_URL?.trim();
if (!token) {
  logError("boot", "Нет BOT_TOKEN в .env");
  process.exit(1);
}
if (!apiUrl) {
  logError("boot", "Нет TELEGRAM_API_URL в .env");
  process.exit(1);
}

const api = createApi(token, apiUrl);

async function showPicker(chatId, messageId, ctx) {
  const rich = renderPicker();
  if (messageId) {
    await runStep("showPicker.editRichMessage", ctx, () =>
      api.editRichMessage(chatId, messageId, rich)
    );
    return;
  }
  await runStep("showPicker.sendRichMessage", ctx, () =>
    api.sendRichMessage(chatId, rich)
  );
}

async function startGame(chatId, messageId, sizeKey, ctx) {
  await runStep("startGame.editRichMessage", { ...ctx, detail: `size=${sizeKey}` }, () =>
    api.editRichMessage(chatId, messageId, renderBoard(createGame(sizeKey)))
  );
}

async function handleStart(msg) {
  const ctx = msgContext(msg);
  upsertUser(msg.from).catch((err) => {
    logError("handleStart.upsertUser", errDetail(err), ctx);
  });
  await showPicker(msg.chat.id, null, ctx);
}

async function handleCallback(q) {
  const ctx = callbackContext(q);
  const chatId = q.message?.chat?.id;
  const messageId = q.message?.message_id;
  const data = q.data || "";

  if (chatId == null || messageId == null) {
    await runStep("handleCallback.answerCallback", ctx, () =>
      api.answerCallback(q.id)
    );
    return;
  }

  if (data === "n") {
    await showPicker(chatId, messageId, ctx);
    await runStep("handleCallback.answerCallback", ctx, () =>
      api.answerCallback(q.id)
    );
    return;
  }

  const sizeMatch = /^s:(8|10)$/.exec(data);
  if (sizeMatch) {
    const key = Number(sizeMatch[1]);
    if (!SIZES[key]) {
      await runStep("handleCallback.answerCallback", ctx, () =>
        api.answerCallback(q.id, { text: "Неизвестный размер" })
      );
      return;
    }
    await startGame(chatId, messageId, key, ctx);
    await runStep("handleCallback.answerCallback", ctx, () =>
      api.answerCallback(q.id)
    );
    return;
  }

  const packed = unpackOpen(data);
  if (packed) {
    const game = fromPacked(packed);
    if (game.status !== "playing") {
      await runStep("handleCallback.answerCallback", ctx, () =>
        api.answerCallback(q.id)
      );
      return;
    }
    if (game.revealed[packed.r][packed.c]) {
      await runStep("handleCallback.answerCallback", ctx, () =>
        api.answerCallback(q.id)
      );
      return;
    }
    const before = game.status;
    openCell(game, packed.r, packed.c);

    if (game.status === "lost" && before !== "lost") {
      await runStep("handleCallback.editRichMessage", { ...ctx, detail: "lost" }, () =>
        api.editRichMessage(chatId, messageId, renderBoard(game))
      );
      await runStep("handleCallback.answerCallback", ctx, () =>
        api.answerCallback(q.id, {
          text: "Ошибка: мина!",
          show_alert: true,
        })
      );
      return;
    }

    await runStep("handleCallback.editRichMessage", ctx, () =>
      api.editRichMessage(chatId, messageId, renderBoard(game))
    );
    if (game.status === "won") {
      await runStep("handleCallback.answerCallback", { ...ctx, detail: "won" }, () =>
        api.answerCallback(q.id, { text: "Победа!" })
      );
      return;
    }
    await runStep("handleCallback.answerCallback", ctx, () =>
      api.answerCallback(q.id)
    );
    return;
  }

  await runStep("handleCallback.answerCallback", { ...ctx, detail: "unknown_data" }, () =>
    api.answerCallback(q.id)
  );
}

async function handleUpdate(update) {
  const ctx = updateContext(update);
  if (update.message?.text) {
    const text = update.message.text.trim();
    if (text === "/start" || text.startsWith("/start ")) {
      await runStep("handleUpdate.start", ctx, () => handleStart(update.message));
    }
    return;
  }
  if (update.callback_query) {
    await runStep("handleUpdate.callback", ctx, () =>
      handleCallback(update.callback_query)
    );
  }
}

async function poll() {
  await runStep("poll.deleteWebhook", {}, () => api.deleteWebhook());
  logInfo("poll", "polling…");
  let offset = 0;

  for (;;) {
    let updates;
    try {
      updates = await api.getUpdates({ offset, timeout: 30 });
    } catch (err) {
      if (err.name === "AbortError") continue;
      logError("poll.getUpdates", errDetail(err), { detail: `offset=${offset}` });
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    for (const update of updates) {
      offset = update.update_id + 1;
      if (!isPrivateUpdate(update)) continue;

      const ctx = updateContext(update);

      try {
        await handleUpdate(update);
      } catch (err) {
        logError("poll.handleUpdate", errDetail(err), ctx);
        if (update.callback_query?.id) {
          try {
            await api.answerCallback(update.callback_query.id);
          } catch (answerErr) {
            logError("poll.answerCallback", errDetail(answerErr), ctx);
          }
        }
      }

      insertUpdate(updateUserId(update), update).catch((err) => {
        logError("poll.insertUpdate", errDetail(err), ctx);
      });
    }
  }
}

function isPrivateUpdate(update) {
  const chat =
    update.message?.chat ||
    update.edited_message?.chat ||
    update.callback_query?.message?.chat ||
    update.channel_post?.chat ||
    update.edited_channel_post?.chat;
  if (chat) return chat.type === "private";
  return false;
}

function updateUserId(update) {
  return (
    update.message?.from?.id ??
    update.callback_query?.from?.id ??
    null
  );
}

initDb()
  .then(() => poll())
  .catch((err) => {
    logError("boot", errDetail(err));
    process.exit(1);
  });
