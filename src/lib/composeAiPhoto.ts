import { loadImage, drawCover } from "./canvasUtils";
import {
  CANVAS_H,
  CANVAS_W,
  PC,
  fillGradientText,
  roundRect,
} from "./pineconeBrand";

const W = CANVAS_W;
const H = CANVAS_H;
const FOOTER_H = 100;
const FLOOR_Y = H - FOOTER_H - 20;

/**
 * Side-by-side photo together with branded Pinecone frame overlay.
 */
export async function composeAiPhoto(
  fanCutoutUrl: string,
  playerCutoutUrl: string,
  backgroundUrl: string | null
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  if (backgroundUrl) {
    const bg = await loadImage(backgroundUrl);
    drawCover(ctx, bg, 0, 0, W, H);
    ctx.fillStyle = "rgba(14, 26, 20, 0.22)";
    ctx.fillRect(0, 0, W, H);
  } else {
    drawAcademyStage(ctx);
  }

  const [fan, player] = await Promise.all([
    loadImage(fanCutoutUrl),
    loadImage(playerCutoutUrl),
  ]);

  drawPerson(ctx, fan, W * 0.32, "YOU");
  drawPerson(ctx, player, W * 0.68, "MONGOLZ");

  applyPhotoGrade(ctx);
  drawBrandedFrame(ctx);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function drawAcademyStage(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0c1812");
  sky.addColorStop(0.5, "#142820");
  sky.addColorStop(1, "#0a100e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const led = ctx.createRadialGradient(W / 2, H * 0.32, 40, W / 2, H * 0.32, 640);
  led.addColorStop(0, "rgba(107,191,58,0.5)");
  led.addColorStop(0.45, "rgba(46,196,182,0.2)");
  led.addColorStop(1, "rgba(107,191,58,0)");
  ctx.fillStyle = led;
  ctx.fillRect(0, 0, W, H);

  // Spotlights
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (const [topX, spread, color] of [
    [W * 0.2, 210, "#8fd84a"],
    [W * 0.5, 250, "#2ec4b6"],
    [W * 0.8, 210, "#9b7ae8"],
  ] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(topX - 18, -10);
    ctx.lineTo(topX + 18, -10);
    ctx.lineTo(topX + spread, FLOOR_Y);
    ctx.lineTo(topX - spread, FLOOR_Y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Bokeh
  ctx.save();
  ctx.filter = "blur(5px)";
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * W;
    const y = H * 0.4 + Math.random() * H * 0.35;
    ctx.fillStyle = Math.random() > 0.45
      ? `rgba(143,216,74,${0.1 + Math.random() * 0.25})`
      : `rgba(123,79,212,${0.08 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, 2 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Stage floor
  const floor = ctx.createLinearGradient(0, FLOOR_Y - 30, 0, H - FOOTER_H);
  floor.addColorStop(0, "#1a2820");
  floor.addColorStop(1, "#0c1410");
  ctx.fillStyle = floor;
  ctx.fillRect(0, FLOOR_Y - 24, W, H - FOOTER_H - FLOOR_Y + 24);

  const sheen = ctx.createLinearGradient(0, FLOOR_Y - 24, 0, FLOOR_Y + 60);
  sheen.addColorStop(0, "rgba(46,196,182,0.15)");
  sheen.addColorStop(1, "rgba(46,196,182,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, FLOOR_Y - 24, W, 84);
}

function drawPerson(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  centerX: number,
  label: string
) {
  const targetH = (H - FOOTER_H) * 0.68;
  const scale = targetH / img.height;
  const w = img.width * scale;
  const h = targetH;
  const x = centerX - w / 2;
  const y = FLOOR_Y - h;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.filter = "blur(16px)";
  ctx.beginPath();
  ctx.ellipse(centerX, FLOOR_Y - 6, w * 0.34, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();

  // Name label floating above feet
  ctx.font = "bold 20px Arial, sans-serif";
  const textW = ctx.measureText(label).width;
  const plateW = textW + 32;
  const plateH = 34;
  const px = centerX - plateW / 2;
  const py = FLOOR_Y - 8;

  roundRect(ctx, px, py, plateW, plateH, 17);
  ctx.fillStyle = label === "YOU" ? PC.greenDark : "rgba(255,255,255,0.92)";
  ctx.fill();
  if (label !== "YOU") {
    roundRect(ctx, px, py, plateW, plateH, 17);
    ctx.strokeStyle = "rgba(107,191,58,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.fillStyle = label === "YOU" ? PC.white : PC.text;
  ctx.fillText(label, centerX, py + 23);
}

function applyPhotoGrade(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = "rgba(107,191,58,0.05)";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const vignette = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H - FOOTER_H);
}

function drawBrandedFrame(ctx: CanvasRenderingContext2D) {
  const y = H - FOOTER_H;

  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.fillRect(0, y, W, FOOTER_H);

  const line = ctx.createLinearGradient(0, y, W, y);
  line.addColorStop(0, PC.greenDark);
  line.addColorStop(0.5, PC.teal);
  line.addColorStop(1, PC.purple);
  ctx.fillStyle = line;
  ctx.fillRect(0, y, W, 4);

  ctx.textAlign = "center";
  ctx.fillStyle = PC.textMuted;
  ctx.font = "600 16px Arial, sans-serif";
  ctx.fillText("PINECONE ACADEMY · PHOTO TOGETHER", W / 2, y + 34);

  fillGradientText(
    ctx,
    "ME × THE MONGOLZ",
    W / 2,
    y + 72,
    "900 34px 'Arial Black', Arial, sans-serif",
    [PC.purple, PC.teal]
  );
}
