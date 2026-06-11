import { loadImage, drawCover, type PlayerForCompose } from "./canvasUtils";

const W = 1080;
const H = 1350;

const C = {
  bg: "#090d12",
  bgPanel: "#0d1117",
  grid: "rgba(72,120,180,0.07)",
  gold: "#e8c84a",
  goldDim: "rgba(232,200,74,0.55)",
  ct: "#4a9eff",
  ctDim: "rgba(74,158,255,0.18)",
  t: "#ff6b35",
  tDim: "rgba(255,107,53,0.18)",
  kill: "#ff3d3d",
  text: "#c8d6e5",
  textDim: "rgba(200,214,229,0.45)",
  border: "rgba(200,214,229,0.12)",
  scanline: "rgba(0,0,0,0.18)",
};

export async function composeBooth(
  cutoutUrl: string,
  players: PlayerForCompose[]
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  drawBackground(ctx);
  drawHexGrid(ctx);
  drawScanlines(ctx);
  drawTopBar(ctx);

  const playerImages = await Promise.all(
    players.map((p) => (p.photoUrl ? loadImage(p.photoUrl) : null))
  );

  drawKillFeed(ctx, players, playerImages);

  const cutout = await loadImage(cutoutUrl);
  drawSpectatorFrame(ctx, cutout);

  drawRadar(ctx);
  drawScorePanel(ctx, players);
  drawRoundBanner(ctx);

  return canvas.toDataURL("image/png");
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 900);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // Diagonal accent lines (CT blue tint)
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = C.ct;
  ctx.lineWidth = 1;
  for (let i = -20; i < 30; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 80 - H, 0);
    ctx.lineTo(i * 80 + H, H);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHexGrid(ctx: CanvasRenderingContext2D) {
  const size = 28;
  const rows = Math.ceil(H / (size * 1.73)) + 2;
  const cols = Math.ceil(W / (size * 2)) + 2;
  ctx.save();
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * size * 2 + (r % 2 === 1 ? size : 0) - size;
      const y = r * size * 1.73 - size;
      hexPath(ctx, x, y, size * 0.85);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawScanlines(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = C.scanline;
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 2);
  }
  ctx.restore();
}

function drawTopBar(ctx: CanvasRenderingContext2D) {
  // Top bar background
  ctx.fillStyle = "rgba(13,17,23,0.92)";
  ctx.fillRect(0, 0, W, 90);
  ctx.fillStyle = C.gold;
  ctx.fillRect(0, 88, W, 3);

  // CT side tag
  ctx.save();
  ctx.fillStyle = C.ctDim;
  roundRect(ctx, 32, 18, 200, 52, 6);
  ctx.fill();
  ctx.strokeStyle = C.ct;
  ctx.lineWidth = 1.5;
  roundRect(ctx, 32, 18, 200, 52, 6);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = C.ct;
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("[ CT SIDE ]", 48, 40);
  ctx.fillStyle = C.text;
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillText("THE MONGOLZ", 48, 63);

  // Center team logo text
  ctx.textAlign = "center";
  ctx.fillStyle = C.gold;
  ctx.font = "900 38px 'Arial Black', Arial, sans-serif";
  ctx.fillText("★ MONGOLZ ★", W / 2, 62);

  // Round timer
  ctx.save();
  ctx.fillStyle = "rgba(232,200,74,0.12)";
  roundRect(ctx, W - 232, 18, 200, 52, 6);
  ctx.fill();
  ctx.strokeStyle = C.goldDim;
  ctx.lineWidth = 1.5;
  roundRect(ctx, W - 232, 18, 200, 52, 6);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = C.goldDim;
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.textAlign = "right";
  ctx.fillText("[ ROUND 16 ]", W - 48, 40);
  ctx.fillStyle = C.gold;
  ctx.font = "bold 22px 'Courier New', monospace";
  ctx.fillText("FAN ZONE", W - 48, 63);
}

function drawKillFeed(
  ctx: CanvasRenderingContext2D,
  players: PlayerForCompose[],
  images: (HTMLImageElement | null)[]
) {
  const feedX = W - 420;
  const feedY = 115;
  const rowH = 104;

  players.forEach((player, i) => {
    const y = feedY + i * rowH;
    const img = images[i];

    // Row background
    ctx.save();
    ctx.fillStyle = i % 2 === 0 ? "rgba(74,158,255,0.07)" : "rgba(13,17,23,0.7)";
    roundRect(ctx, feedX, y, 400, 90, 8);
    ctx.fill();
    ctx.strokeStyle = i % 2 === 0 ? "rgba(74,158,255,0.3)" : C.border;
    ctx.lineWidth = 1;
    roundRect(ctx, feedX, y, 400, 90, 8);
    ctx.stroke();
    ctx.restore();

    // Avatar circle
    const avatarR = 32;
    const ax = feedX + 20 + avatarR;
    const ay = y + 45;

    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax, ay, avatarR, 0, Math.PI * 2);
      ctx.clip();
      drawCover(ctx, img, ax - avatarR, ay - avatarR, avatarR * 2, avatarR * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = "#1a2233";
      ctx.beginPath();
      ctx.arc(ax, ay, avatarR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.ct;
      ctx.font = `bold 28px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(player.name[0].toUpperCase(), ax, ay);
      ctx.textBaseline = "alphabetic";
    }

    // Avatar ring
    ctx.beginPath();
    ctx.arc(ax, ay, avatarR, 0, Math.PI * 2);
    ctx.strokeStyle = C.ct;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Kill icon
    const iconX = feedX + 20 + avatarR * 2 + 16;
    ctx.fillStyle = C.kill;
    ctx.font = "bold 20px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("✦", iconX, ay);
    ctx.textBaseline = "alphabetic";

    // Player name
    ctx.fillStyle = C.text;
    ctx.font = `bold 26px 'Courier New', monospace`;
    ctx.textAlign = "left";
    ctx.fillText(player.name, iconX + 32, y + 35);

    // Role tag
    const role = i === 0 ? "IGL" : i === 1 ? "AWPer" : i === 2 ? "Rifler" : i === 3 ? "Entry" : "Support";
    ctx.fillStyle = C.ctDim;
    roundRect(ctx, iconX + 32, y + 46, 80, 24, 4);
    ctx.fill();
    ctx.fillStyle = C.ct;
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillText(role, iconX + 40, y + 63);

    // K/D
    ctx.fillStyle = C.gold;
    ctx.font = "bold 22px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${20 + i * 3}/${2 + i}`, feedX + 390, y + 56);
  });
}

function drawSpectatorFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const frameX = 32;
  const frameY = 110;
  const frameW = W - 460;
  const frameH = 840;

  // Panel background
  ctx.fillStyle = "rgba(13,17,23,0.85)";
  ctx.save();
  roundRect(ctx, frameX - 4, frameY - 4, frameW + 8, frameH + 8, 12);
  ctx.fill();
  ctx.restore();

  // Corner bracket decorations
  const bracketSize = 28;
  const bracketW = 3;
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = bracketW;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(frameX, frameY + bracketSize);
  ctx.lineTo(frameX, frameY);
  ctx.lineTo(frameX + bracketSize, frameY);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(frameX + frameW - bracketSize, frameY);
  ctx.lineTo(frameX + frameW, frameY);
  ctx.lineTo(frameX + frameW, frameY + bracketSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(frameX, frameY + frameH - bracketSize);
  ctx.lineTo(frameX, frameY + frameH);
  ctx.lineTo(frameX + bracketSize, frameY + frameH);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(frameX + frameW - bracketSize, frameY + frameH);
  ctx.lineTo(frameX + frameW, frameY + frameH);
  ctx.lineTo(frameX + frameW, frameY + frameH - bracketSize);
  ctx.stroke();

  // Spectator label
  ctx.save();
  ctx.fillStyle = "rgba(232,200,74,0.15)";
  roundRect(ctx, frameX, frameY, 200, 30, 4);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = C.gold;
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("▶ SPECTATING : FAN", frameX + 10, frameY + 20);

  // CT/T health bar line
  ctx.fillStyle = "rgba(74,158,255,0.25)";
  ctx.fillRect(frameX, frameY + 30, frameW * 0.55, 4);
  ctx.fillStyle = "rgba(255,107,53,0.25)";
  ctx.fillRect(frameX + frameW * 0.55, frameY + 30, frameW * 0.45, 4);

  // User cutout
  const maxW = frameW - 20;
  const maxH = frameH - 50;
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = frameX + (frameW - w) / 2;
  const y = frameY + frameH - h - 8;

  // Glow under cutout
  const glow = ctx.createRadialGradient(x + w / 2, y + h, 30, x + w / 2, y + h, 280);
  glow.addColorStop(0, "rgba(74,158,255,0.28)");
  glow.addColorStop(1, "rgba(74,158,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(frameX, frameY, frameW, frameH);

  ctx.save();
  ctx.shadowColor = "rgba(74,158,255,0.5)";
  ctx.shadowBlur = 40;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();

  // "ALIVE" status dot
  ctx.beginPath();
  ctx.arc(frameX + frameW - 20, frameY + 20, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#44ff88";
  ctx.fill();
  ctx.fillStyle = C.text;
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.textAlign = "right";
  ctx.fillText("ALIVE", frameX + frameW - 30, frameY + 24);
}

function drawRadar(ctx: CanvasRenderingContext2D) {
  const cx = W - 215;
  const cy = H - 390;
  const r = 90;

  // Radar bg
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(9,13,18,0.9)";
  ctx.fill();
  ctx.strokeStyle = C.ct;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Radar rings
  ctx.save();
  ctx.strokeStyle = "rgba(74,158,255,0.18)";
  ctx.lineWidth = 1;
  for (const rr of [r * 0.33, r * 0.66]) {
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Cross hairs
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.moveTo(cx, cy + r);
  ctx.stroke();
  ctx.restore();

  // Random player dots
  const dots = [
    { dx: -38, dy: -22, color: C.ct },
    { dx: 28, dy: -45, color: C.ct },
    { dx: -12, dy: 30, color: C.t },
    { dx: 52, dy: 18, color: C.t },
    { dx: 5, dy: -10, color: C.gold },
  ];
  dots.forEach(({ dx, dy, color }) => {
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  ctx.fillStyle = C.textDim;
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("RADAR", cx, cy + r + 20);
}

function drawScorePanel(ctx: CanvasRenderingContext2D, players: PlayerForCompose[]) {
  const px = W - 420;
  const py = H - 280;
  const pw = 400;
  const ph = 80;

  ctx.save();
  ctx.fillStyle = "rgba(13,17,23,0.92)";
  roundRect(ctx, px, py, pw, ph, 8);
  ctx.fill();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.5;
  roundRect(ctx, px, py, pw, ph, 8);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = C.goldDim;
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("[ FAN STATS ]", px + 14, py + 22);

  ctx.fillStyle = C.gold;
  ctx.font = "bold 30px 'Courier New', monospace";
  ctx.fillText("★ FAN MVP", px + 14, py + 62);

  ctx.fillStyle = C.text;
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${players.length}v5`, px + pw - 14, py + 62);
}

function drawRoundBanner(ctx: CanvasRenderingContext2D) {
  const bannerH = 110;
  const y = H - bannerH;

  // Bar
  ctx.fillStyle = "rgba(9,13,18,0.95)";
  ctx.fillRect(0, y, W, bannerH);
  ctx.fillStyle = C.gold;
  ctx.fillRect(0, y, W, 3);

  // Left: CT badge
  ctx.save();
  ctx.fillStyle = C.ctDim;
  roundRect(ctx, 32, y + 20, 180, 70, 8);
  ctx.fill();
  ctx.strokeStyle = C.ct;
  ctx.lineWidth = 1.5;
  roundRect(ctx, 32, y + 20, 180, 70, 8);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = C.ct;
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("[ CT SIDE ]", 122, y + 40);
  ctx.fillStyle = C.text;
  ctx.font = "900 24px 'Arial Black', Arial, sans-serif";
  ctx.fillText("MONGOLZ", 122, y + 72);

  // Center: round win text
  ctx.fillStyle = C.gold;
  ctx.font = "900 42px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ME × THE MONGOLZ", W / 2, y + 70);

  // Right: score
  ctx.save();
  ctx.fillStyle = "rgba(232,200,74,0.12)";
  roundRect(ctx, W - 212, y + 20, 180, 70, 8);
  ctx.fill();
  ctx.strokeStyle = C.goldDim;
  ctx.lineWidth = 1.5;
  roundRect(ctx, W - 212, y + 20, 180, 70, 8);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = C.goldDim;
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("[ ROUND WIN ]", W - 122, y + 40);
  ctx.fillStyle = C.gold;
  ctx.font = "900 28px 'Arial Black', Arial, sans-serif";
  ctx.fillText("16  :  4", W - 122, y + 73);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
