const VER = 1;
const SIZES = new Set([8, 10]);

function bitBytes(n) {
  return Math.ceil((n * n) / 8);
}

function setBit(buf, offset, n, r, c, on) {
  if (!on) return;
  const i = r * n + c;
  buf[offset + (i >> 3)] |= 1 << (i & 7);
}

function getBit(buf, offset, n, r, c) {
  const i = r * n + c;
  return (buf[offset + (i >> 3)] & (1 << (i & 7))) !== 0;
}

export function packOpen(game, r, c) {
  const n = game.size;
  const mlen = bitBytes(n);
  const buf = Buffer.alloc(5 + mlen * 2);
  buf[0] = VER;
  buf[1] = n;
  buf[2] = r;
  buf[3] = c;
  buf[4] = game.board ? 1 : 0;
  if (game.board) {
    for (let rr = 0; rr < n; rr++) {
      for (let cc = 0; cc < n; cc++) {
        setBit(buf, 5, n, rr, cc, game.board[rr][cc] === -1);
      }
    }
  }
  for (let rr = 0; rr < n; rr++) {
    for (let cc = 0; cc < n; cc++) {
      setBit(buf, 5 + mlen, n, rr, cc, game.revealed[rr][cc]);
    }
  }
  const data = "o" + buf.toString("base64url");
  if (Buffer.byteLength(data) > 64) {
    throw new Error(`callback_data too long: ${data.length}`);
  }
  return data;
}

export function unpackOpen(data) {
  if (!data || data[0] !== "o" || data.length < 2) return null;
  let buf;
  try {
    buf = Buffer.from(data.slice(1), "base64url");
  } catch {
    return null;
  }
  if (buf.length < 5 || buf[0] !== VER) return null;
  const size = buf[1];
  if (!SIZES.has(size)) return null;
  const mlen = bitBytes(size);
  if (buf.length !== 5 + mlen * 2) return null;
  const r = buf[2];
  const c = buf[3];
  if (r < 0 || c < 0 || r >= size || c >= size) return null;
  const placed = buf[4] === 1;
  return {
    size,
    r,
    c,
    placed,
    mineBits: buf.subarray(5, 5 + mlen),
    revealedBits: buf.subarray(5 + mlen),
    isMine: (rr, cc) => getBit(buf, 5, size, rr, cc),
    isRevealed: (rr, cc) => getBit(buf, 5 + mlen, size, rr, cc),
  };
}
