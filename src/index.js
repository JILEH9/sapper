import "dotenv/config";
import { createApi } from "./api.js";
import { initDb, insertUpdate, upsertUser } from "./db.js";
import { SIZES, createGame, openCell, fromPacked } from "./game.js";
import { unpackOpen } from "./codec.js";
import { renderPicker, renderBoard } from "./render.js";

const token = process.env.BOT_TOKEN?.trim();
const apiUrl = process.env.TELEGRAM_API_URL?.trim();
if (!token) {
  console.error("Нет BOT_TOKEN в .env");
  process.exit(1);
}
if (!apiUrl) {
  console.error("Нет TELEGRAM_API_URL в .env");
  process.exit(1);
}

const api = createApi(token, apiUrl);

async function showPicker(chatId, messageId) {
  const rich = renderPicker();
  if (messageId) {
    await api.editRichMessage(chatId, messageId, rich);
    return;
  }
  await api.sendRichMessage(chatId, rich);
}

async function startGame(chatId, messageId, sizeKey) {
  await api.editRichMessage(chatId, messageId, renderBoard(createGame(sizeKey)));
}

async function handleStart(msg) {
  await upsertUser(msg.from);
  await showPicker(msg.chat.id, null);
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

async function handleCallback(q) {
  const chatId = q.message?.chat?.id;
  const messageId = q.message?.message_id;
  const data = q.data || "";
  if (chatId == null || messageId == null) {
    await api.answerCallback(q.id);
    return;
  }

  if (data === "n") {
    await showPicker(chatId, messageId);
    await api.answerCallback(q.id);
    return;
  }

  const sizeMatch = /^s:(8|10)$/.exec(data);
  if (sizeMatch) {
    const key = Number(sizeMatch[1]);
    if (!SIZES[key]) {
      await api.answerCallback(q.id, { text: "Неизвестный размер" });
      return;
    }
    await startGame(chatId, messageId, key);
    await api.answerCallback(q.id);
    return;
  }

  const packed = unpackOpen(data);
  if (packed) {
    const game = fromPacked(packed);
    if (game.status !== "playing") {
      await api.answerCallback(q.id);
      return;
    }
    if (game.revealed[packed.r][packed.c]) {
      await api.answerCallback(q.id);
      return;
    }
    const before = game.status;
    openCell(game, packed.r, packed.c);

    if (game.status === "lost" && before !== "lost") {
      await api.editRichMessage(chatId, messageId, renderBoard(game));
      await api.answerCallback(q.id, {
        text: "Ошибка: мина!",
        show_alert: true,
      });
      return;
    }

    await api.editRichMessage(chatId, messageId, renderBoard(game));
    if (game.status === "won") {
      await api.answerCallback(q.id, { text: "Победа!" });
      return;
    }
    await api.answerCallback(q.id);
    return;
  }

  await api.answerCallback(q.id);
}

async function handleUpdate(update) {
  if (update.message?.text) {
    const text = update.message.text.trim();
    if (text === "/start" || text.startsWith("/start ")) {
      await handleStart(update.message);
    }
    return;
  }
  if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
}

async function poll() {
  await api.deleteWebhook();
  console.log("polling…");
  let offset = 0;

  for (;;) {
    let updates;
    try {
      updates = await api.getUpdates({ offset, timeout: 30 });
    } catch (err) {
      if (err.name === "AbortError") continue;
      console.error("getUpdates:", err.message);
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    for (const update of updates) {
      offset = update.update_id + 1;
      if (!isPrivateUpdate(update)) continue;
      try {
        await insertUpdate(updateUserId(update), update);
        await handleUpdate(update);
      } catch (err) {
        console.error("update", update.update_id, err.message);
        if (update.callback_query?.id) {
          try {
            await api.answerCallback(update.callback_query.id);
          } catch {
            /* already answered or stale */
          }
        }
      }
    }
  }
}

initDb()
  .then(() => poll())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
