/** The MongolZ esports palette. */
export const PC = {
  gold: "#e8c84a",
  goldLight: "#f5dd7a",
  goldDark: "#c9a227",
  accent: "#4a9eff",
  accentDim: "rgba(74,158,255,0.2)",
  bg: "#0a0e14",
  bgPanel: "#141820",
  bgElevated: "#1a1f28",
  text: "#e4e4e7",
  textMuted: "#a1a1aa",
  white: "#ffffff",
  border: "#27272a",
} as const;

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;

export function fillGradientText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  colors: [string, string]
) {
  ctx.font = font;
  ctx.textAlign = "center";
  const w = ctx.measureText(text).width;
  const grad = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  ctx.fillStyle = grad;
  ctx.fillText(text, x, y);
}

export function roundRect(
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

export function drawBrandStripes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bar = ctx.createLinearGradient(0, 0, w, 0);
  bar.addColorStop(0, PC.goldDark);
  bar.addColorStop(0.5, PC.gold);
  bar.addColorStop(1, PC.goldDark);
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, w, 4);
  ctx.fillRect(0, h - 4, w, 4);
}

export function drawAcademyBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0c1018");
  bg.addColorStop(0.55, "#0a0e14");
  bg.addColorStop(1, "#080b10");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(74,158,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  drawBrandStripes(ctx, w, h);
}

export function drawPosterHeader(
  ctx: CanvasRenderingContext2D,
  w: number,
  subtitle: string,
  title = "THE MONGOLZ"
): number {
  ctx.textAlign = "center";
  ctx.fillStyle = PC.textMuted;
  ctx.font = "700 14px Arial, sans-serif";
  ctx.fillText(subtitle, w / 2, 32);

  fillGradientText(
    ctx,
    title,
    w / 2,
    82,
    "900 56px 'Arial Black', Arial, sans-serif",
    [PC.goldLight, PC.gold]
  );

  const divW = 360;
  const divX = (w - divW) / 2;
  ctx.strokeStyle = "rgba(232,200,74,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(divX, 102);
  ctx.lineTo(divX + divW, 102);
  ctx.stroke();

  return 118;
}

export function drawPosterFooter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tagline: string,
  height = 78
) {
  const y = h - height;
  ctx.fillStyle = PC.bgPanel;
  ctx.fillRect(0, y, w, height);

  ctx.fillStyle = PC.gold;
  ctx.fillRect(0, y, w, 3);

  ctx.textAlign = "center";
  ctx.fillStyle = PC.textMuted;
  ctx.font = "600 15px Arial, sans-serif";
  ctx.fillText("FAN PROJECT · 2026", w / 2, y + 28);

  fillGradientText(
    ctx,
    tagline,
    w / 2,
    y + 62,
    "900 30px 'Arial Black', Arial, sans-serif",
    [PC.goldLight, PC.gold]
  );
}
