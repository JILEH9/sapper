export function createApi(token, baseUrl) {
  const base = String(baseUrl).replace(/\/+$/, "");
  const url = (method) => `${base}/bot${token}/${method}`;

  async function call(method, body = {}, { timeoutMs } = {}) {
    const ctrl = new AbortController();
    const timer =
      timeoutMs != null
        ? setTimeout(() => ctrl.abort(), timeoutMs)
        : null;

    try {
      let res;
      try {
        res = await fetch(url(method), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
      } catch (err) {
        if (err.name === "AbortError") throw err;
        const netErr = new Error(`fetch failed: ${method} -> ${base}`);
        netErr.cause = err;
        netErr.code = err.code;
        netErr.apiMethod = method;
        throw netErr;
      }

      let data;
      try {
        data = await res.json();
      } catch (err) {
        const parseErr = new Error(
          `${method} bad response: HTTP ${res.status} (not JSON)`
        );
        parseErr.apiMethod = method;
        parseErr.code = err.code;
        throw parseErr;
      }

      if (!data.ok) {
        const desc = data.description || res.statusText;
        if (
          method === "editMessageText" &&
          /message is not modified/i.test(desc)
        ) {
          return null;
        }
        const err = new Error(`${method} failed: ${desc}`);
        err.payload = data;
        err.apiMethod = method;
        throw err;
      }
      return data.result;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    deleteWebhook() {
      return call("deleteWebhook", { drop_pending_updates: false });
    },

    getUpdates({ offset, timeout = 30 } = {}) {
      return call(
        "getUpdates",
        {
          offset,
          timeout,
          allowed_updates: ["message", "callback_query"],
        },
        { timeoutMs: (timeout + 10) * 1000 }
      );
    },

    sendRichMessage(chatId, rich, extra = {}) {
      return call("sendRichMessage", {
        chat_id: chatId,
        rich_message: { skip_entity_detection: true, ...rich },
        ...extra,
      });
    },

    editRichMessage(chatId, messageId, rich) {
      return call("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        rich_message: { skip_entity_detection: true, ...rich },
      });
    },

    answerCallback(queryId, extra = {}) {
      return call("answerCallbackQuery", {
        callback_query_id: queryId,
        ...extra,
      });
    },
  };
}
