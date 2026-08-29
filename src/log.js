function ts() {
  return new Date().toISOString();
}

function fmtCtx(ctx = {}) {
  const parts = [];
  if (ctx.where) parts.push(`where=${ctx.where}`);
  if (ctx.updateId != null) parts.push(`update=${ctx.updateId}`);
  if (ctx.userId != null) parts.push(`user=${ctx.userId}`);
  if (ctx.chatId != null) parts.push(`chat=${ctx.chatId}`);
  if (ctx.kind) parts.push(`kind=${ctx.kind}`);
  if (ctx.callbackData != null) parts.push(`data=${ctx.callbackData}`);
  if (ctx.detail) parts.push(ctx.detail);
  return parts.length ? `[${parts.join(" ")}]` : "";
}

export function errDetail(err) {
  const parts = [err?.message ?? String(err)];
  if (err?.apiMethod) parts.push(`method=${err.apiMethod}`);
  if (err?.code) parts.push(`code=${err.code}`);
  if (err?.cause?.code) parts.push(`causeCode=${err.cause.code}`);
  if (err?.cause?.message) parts.push(`cause=${err.cause.message}`);
  return parts.join(" | ");
}

export function updateContext(update) {
  return {
    updateId: update.update_id,
    userId:
      update.message?.from?.id ??
      update.callback_query?.from?.id ??
      null,
    chatId:
      update.message?.chat?.id ??
      update.callback_query?.message?.chat?.id ??
      null,
    kind: update.message
      ? "message"
      : update.callback_query
        ? "callback_query"
        : "unknown",
    callbackData: update.callback_query?.data ?? null,
  };
}

export function msgContext(msg) {
  return {
    userId: msg.from?.id ?? null,
    chatId: msg.chat?.id ?? null,
    kind: "message",
  };
}

export function callbackContext(q) {
  return {
    userId: q.from?.id ?? null,
    chatId: q.message?.chat?.id ?? null,
    kind: "callback_query",
    callbackData: q.data ?? null,
  };
}

export function logInfo(where, message, ctx = {}) {
  const tag = fmtCtx({ ...ctx, where });
  console.log(ts(), tag, message);
}

export function logError(where, message, ctx = {}) {
  const tag = fmtCtx({ ...ctx, where });
  console.error(ts(), tag, message);
}

export async function runStep(where, ctx, fn) {
  try {
    return await fn();
  } catch (err) {
    if (!err.logged) {
      logError(where, errDetail(err), ctx);
      err.logged = true;
      err.logWhere = where;
    }
    throw err;
  }
}
