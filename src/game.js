export const SIZES = {
  8: { size: 8, mines: 10 },
  10: { size: 10, mines: 16 },
};

const NEIGHBORS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

function inBounds(size, r, c) {
  return r >= 0 && c >= 0 && r < size && c < size;
}

function neighbors(size, r, c) {
  const out = [];
  for (const [dr, dc] of NEIGHBORS) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(size, nr, nc)) out.push([nr, nc]);
  }
  return out;
}

function emptyGrid(size, fill) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => (typeof fill === "function" ? fill() : fill))
  );
}

function placeMines(size, mineCount, safeR, safeC) {
  const forbidden = new Set([`${safeR}:${safeC}`]);
  for (const [nr, nc] of neighbors(size, safeR, safeC)) {
    forbidden.add(`${nr}:${nc}`);
  }

  const free = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!forbidden.has(`${r}:${c}`)) free.push([r, c]);
    }
  }

  const count = Math.min(mineCount, free.length);
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }

  const board = emptyGrid(size, 0);
  for (let i = 0; i < count; i++) {
    const [r, c] = free[i];
    board[r][c] = -1;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === -1) continue;
      let n = 0;
      for (const [nr, nc] of neighbors(size, r, c)) {
        if (board[nr][nc] === -1) n++;
      }
      board[r][c] = n;
    }
  }

  return board;
}

function floodReveal(game, r, c) {
  const stack = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    if (!inBounds(game.size, cr, cc) || game.revealed[cr][cc]) continue;
    game.revealed[cr][cc] = true;
    if (game.board[cr][cc] !== 0) continue;
    for (const [nr, nc] of neighbors(game.size, cr, cc)) {
      if (!game.revealed[nr][nc]) stack.push([nr, nc]);
    }
  }
}

function checkWin(game) {
  const need = game.size * game.size - game.mines;
  let opened = 0;
  for (let r = 0; r < game.size; r++) {
    for (let c = 0; c < game.size; c++) {
      if (game.revealed[r][c] && game.board[r][c] !== -1) opened++;
    }
  }
  if (opened >= need) game.status = "won";
}

function boardFromMines(size, isMine) {
  const board = emptyGrid(size, 0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isMine(r, c)) board[r][c] = -1;
    }
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === -1) continue;
      let n = 0;
      for (const [nr, nc] of neighbors(size, r, c)) {
        if (board[nr][nc] === -1) n++;
      }
      board[r][c] = n;
    }
  }
  return board;
}

function deriveStatus(game) {
  if (!game.board) return "playing";
  let hit = false;
  let opened = 0;
  for (let r = 0; r < game.size; r++) {
    for (let c = 0; c < game.size; c++) {
      if (!game.revealed[r][c]) continue;
      if (game.board[r][c] === -1) hit = true;
      else opened++;
    }
  }
  if (hit) return "lost";
  if (opened >= game.size * game.size - game.mines) return "won";
  return "playing";
}

export function fromPacked(p) {
  const game = createGame(p.size);
  const revealed = emptyGrid(game.size, false);
  for (let r = 0; r < game.size; r++) {
    for (let c = 0; c < game.size; c++) {
      revealed[r][c] = p.isRevealed(r, c);
    }
  }
  game.revealed = revealed;
  if (p.placed) {
    game.board = boardFromMines(game.size, p.isMine);
    game.status = deriveStatus(game);
  }
  return game;
}

export function createGame(sizeKey) {
  const cfg = SIZES[sizeKey];
  if (!cfg) throw new Error(`unknown size: ${sizeKey}`);
  return {
    size: cfg.size,
    mines: cfg.mines,
    board: null,
    revealed: emptyGrid(cfg.size, false),
    status: "playing",
    exploded: null,
  };
}

export function openedSafe(game) {
  if (!game.board) return 0;
  let n = 0;
  for (let r = 0; r < game.size; r++) {
    for (let c = 0; c < game.size; c++) {
      if (game.revealed[r][c] && game.board[r][c] !== -1) n++;
    }
  }
  return n;
}

export function totalSafe(game) {
  return game.size * game.size - game.mines;
}

export function openCell(game, r, c) {
  if (game.status !== "playing") return game;
  if (!inBounds(game.size, r, c) || game.revealed[r][c]) return game;

  if (!game.board) {
    game.board = placeMines(game.size, game.mines, r, c);
  }

  if (game.board[r][c] === -1) {
    game.revealed[r][c] = true;
    game.status = "lost";
    game.exploded = { r, c };
    for (let rr = 0; rr < game.size; rr++) {
      for (let cc = 0; cc < game.size; cc++) {
        if (game.board[rr][cc] === -1) game.revealed[rr][cc] = true;
      }
    }
    return game;
  }

  floodReveal(game, r, c);
  checkWin(game);
  return game;
}
