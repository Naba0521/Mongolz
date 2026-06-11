/** Pinecone Academy brand palette (from logo). */
export const PC = {
  green: "#6bbf3a",
  greenLight: "#8fd84a",
  greenDark: "#2d8a4e",
  purple: "#7b4fd4",
  purpleLight: "#9b7ae8",
  teal: "#2ec4b6",
  tealDark: "#1ab8a8",
  cream: "#f7faf5",
  mint: "#e8f5e3",
  mintDark: "#d4edd0",
  text: "#1e3a2f",
  textMuted: "#5a7a62",
  white: "#ffffff",
} as const;

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;

/** Draw centered text filled with a horizontal gradient. */
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

/** Top + bottom brand accent stripes. */
export function drawBrandStripes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bar = ctx.createLinearGradient(0, 0, w, 0);
  bar.addColorStop(0, PC.greenDark);
  bar.addColorStop(0.35, PC.green);
  bar.addColorStop(0.65, PC.teal);
  bar.addColorStop(1, PC.purple);
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, w, 5);
  ctx.fillRect(0, h - 5, w, 5);
}

/** Soft Pinecone background with decorative blobs. */
export function drawAcademyBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, PC.cream);
  bg.addColorStop(0.55, PC.mint);
  bg.addColorStop(1, PC.mintDark);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const blobs = [
    { x: w * 0.12, y: h * 0.2, r: 260, c: "rgba(107,191,58,0.1)" },
    { x: w * 0.88, y: h * 0.3, r: 220, c: "rgba(46,196,182,0.09)" },
    { x: w * 0.5, y: h * 0.75, r: 340, c: "rgba(123,79,212,0.07)" },
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x, b.y, 20, b.x, b.y, b.r);
    g.addColorStop(0, b.c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  drawBrandStripes(ctx, w, h);
}

/** Branded poster header block. Returns bottom Y. */
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
    [PC.purple, PC.teal]
  );

  const divW = 360;
  const divX = (w - divW) / 2;
  const divGrad = ctx.createLinearGradient(divX, 0, divX + divW, 0);
  divGrad.addColorStop(0, "rgba(123,79,212,0)");
  divGrad.addColorStop(0.5, PC.green);
  divGrad.addColorStop(1, "rgba(46,196,182,0)");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(divX, 102);
  ctx.lineTo(divX + divW, 102);
  ctx.stroke();

  return 118;
}

/** Branded footer bar. */
export function drawPosterFooter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tagline: string,
  height = 78
) {
  const y = h - height;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fillRect(0, y, w, height);

  const line = ctx.createLinearGradient(0, y, w, y);
  line.addColorStop(0, PC.greenDark);
  line.addColorStop(0.5, PC.teal);
  line.addColorStop(1, PC.purple);
  ctx.fillStyle = line;
  ctx.fillRect(0, y, w, 4);

  ctx.textAlign = "center";
  ctx.fillStyle = PC.textMuted;
  ctx.font = "600 15px Arial, sans-serif";
  ctx.fillText("PINECONE ACADEMY · 2026", w / 2, y + 28);

  fillGradientText(
    ctx,
    tagline,
    w / 2,
    y + 62,
    "900 30px 'Arial Black', Arial, sans-serif",
    [PC.purple, PC.teal]
  );
}
