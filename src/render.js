import { openedSafe, totalSafe } from "./game.js";
import { packOpen } from "./codec.js";

const CLOSED_ID = "5220005833110199517";
const MINE_ID = "5249496324105062810";
const RESTART_ID = "5877410604225924969";
const NUMBER_IDS = {
  1: ["5382322671679708881", "1️⃣"],
  2: ["5465133042760689338", "2️⃣"],
  3: ["5235824798956791363", "3️⃣"],
  4: ["5382054253403577563", "4️⃣"],
  5: ["5431437980646517845", "5️⃣"],
};

function emoji(id, alt) {
  return { type: "custom_emoji", custom_emoji_id: id, alternative_text: alt };
}

function emojiButton(game, r, c, id, alt) {
  return {
    type: "button",
    button: {
      text: emoji(id, alt),
      style: "link",
      callback_data: packOpen(game, r, c),
    },
  };
}

function cell(game, r, c) {
  const align = { align: "center", valign: "middle" };

  if (!game.revealed[r][c]) {
    return {
      ...align,
      is_header: true,
      text: emojiButton(game, r, c, CLOSED_ID, "🫣"),
    };
  }

  const val = game.board[r][c];
  if (val === 0) return align;
  if (val === -1) {
    return { ...align, text: emojiButton(game, r, c, MINE_ID, "💣") };
  }
  if (NUMBER_IDS[val]) {
    const [id, alt] = NUMBER_IDS[val];
    return { ...align, text: emojiButton(game, r, c, id, alt) };
  }
  return { ...align, text: String(val) };
}

function statusQuote(game) {
  let text;
  if (game.status === "lost") {
    text = [{ type: "bold", text: "Ошибка" }, ": мина на этой клетке."];
  } else if (game.status === "won") {
    text = [{ type: "bold", text: "Победа" }, ". Все безопасные клетки открыты."];
  } else {
    text = `Мины: ${game.mines} · Открыто: ${openedSafe(game)}/${totalSafe(game)}`;
  }

  return {
    type: "blockquote",
    blocks: [{ type: "paragraph", text }],
  };
}

export function renderPicker() {
  return {
    blocks: [
      { type: "heading", text: "Сапёр", size: 2 },
      { type: "paragraph", text: "Выбери размер поля" },
      {
        type: "buttons",
        align: "center",
        buttons: [
          { text: "8×8", style: "link", callback_data: "s:8" },
          { text: "10×10", style: "link", callback_data: "s:10" },
        ],
      },
    ],
  };
}

export function renderBoard(game) {
  const cells = [];
  for (let r = 0; r < game.size; r++) {
    const row = [];
    for (let c = 0; c < game.size; c++) {
      row.push(cell(game, r, c));
    }
    cells.push(row);
  }

  return {
    blocks: [
      { type: "heading", text: "Сапёр", size: 2 },
      {
        type: "table",
        is_bordered: true,
        is_compact: true,
        cells,
      },
      statusQuote(game),
      {
        type: "buttons",
        align: "center",
        buttons: [
          {
            text: [emoji(RESTART_ID, "🔄"), "\u00a0Начать заново"],
            callback_data: "n",
          },
        ],
      },
    ],
  };
}
