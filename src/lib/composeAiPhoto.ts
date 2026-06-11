import { loadImage, drawCover } from "./canvasUtils";

const W = 1080;
const H = 1350;
const FLOOR_Y = H - 80;

/**
 * Side-by-side "photo together": fan on the left, player on the right,
 * over an arena background (AI-generated or locally drawn fallback).
 * Both inputs must be background-removed cutouts.
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
    // Slightly darken so the subjects pop
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(0, 0, W, H);
  } else {
    drawArenaBackdrop(ctx);
  }

  const [fan, player] = await Promise.all([
    loadImage(fanCutoutUrl),
    loadImage(playerCutoutUrl),
  ]);

  drawPerson(ctx, fan, W * 0.31);
  drawPerson(ctx, player, W * 0.69);

  applyPhotoGrade(ctx);

  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Scales a cutout to a shared height and bottom-aligns it on the floor line. */
function drawPerson(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  centerX: number
) {
  const targetH = H * 0.62;
  const scale = targetH / img.height;
  const w = img.width * scale;
  const h = targetH;
  const x = centerX - w / 2;
  const y = FLOOR_Y - h;

  // Soft floor shadow
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.filter = "blur(18px)";
  ctx.beginPath();
  ctx.ellipse(centerX, FLOOR_Y - 8, w * 0.36, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.drawImage(img, x, y, w, h);
}

/** Hand-drawn arena: dark stage, golden LED glow, spotlights, bokeh crowd lights. */
function drawArenaBackdrop(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#05040a");
  sky.addColorStop(0.55, "#15101f");
  sky.addColorStop(1, "#0a0810");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Giant LED screen glow behind the subjects
  const led = ctx.createRadialGradient(W / 2, H * 0.34, 60, W / 2, H * 0.34, 620);
  led.addColorStop(0, "rgba(212, 175, 55, 0.5)");
  led.addColorStop(0.5, "rgba(212, 175, 55, 0.16)");
  led.addColorStop(1, "rgba(212, 175, 55, 0)");
  ctx.fillStyle = led;
  ctx.fillRect(0, 0, W, H);

  // Spotlight beams
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#f5e3a3";
  for (const [topX, spread] of [
    [W * 0.18, 200],
    [W * 0.5, 240],
    [W * 0.82, 200],
  ]) {
    ctx.beginPath();
    ctx.moveTo(topX - 20, -10);
    ctx.lineTo(topX + 20, -10);
    ctx.lineTo(topX + spread, FLOOR_Y);
    ctx.lineTo(topX - spread, FLOOR_Y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Blurred crowd bokeh lights
  ctx.save();
  ctx.filter = "blur(6px)";
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * W;
    const y = H * 0.45 + Math.random() * H * 0.3;
    const r = 2 + Math.random() * 5;
    const warm = Math.random() > 0.4;
    ctx.fillStyle = warm
      ? `rgba(240, 200, 110, ${0.12 + Math.random() * 0.3})`
      : `rgba(150, 160, 230, ${0.1 + Math.random() * 0.22})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Stage floor with reflection sheen
  const floor = ctx.createLinearGradient(0, FLOOR_Y - 40, 0, H);
  floor.addColorStop(0, "#1d1828");
  floor.addColorStop(1, "#070509");
  ctx.fillStyle = floor;
  ctx.fillRect(0, FLOOR_Y - 30, W, H - FLOOR_Y + 30);

  const sheen = ctx.createLinearGradient(0, FLOOR_Y - 30, 0, H);
  sheen.addColorStop(0, "rgba(212, 175, 55, 0.12)");
  sheen.addColorStop(1, "rgba(212, 175, 55, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, FLOOR_Y - 30, W, H - FLOOR_Y + 30);
}

/** Warm grade + vignette so cutouts and background read as one photo. */
function applyPhotoGrade(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = "rgba(212, 175, 55, 0.07)";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    H * 0.35,
    W / 2,
    H / 2,
    H * 0.78
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}
