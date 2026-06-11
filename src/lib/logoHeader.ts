import { loadImage } from "./canvasUtils";
import { PC, roundRect } from "./pineconeBrand";

const LOGO_SRC = "/players/logo.png";

/**
 * Adds a branded header band above the image.
 */
export async function addLogoHeader(dataUrl: string): Promise<string> {
  let logo: HTMLImageElement;
  try {
    logo = await loadImage(LOGO_SRC);
  } catch {
    return dataUrl;
  }

  const img = await loadImage(dataUrl);
  const W = img.width;
  const bandH = Math.round(W * 0.11);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = img.height + bandH;
  const ctx = canvas.getContext("2d")!;

  const bandGrad = ctx.createLinearGradient(0, 0, 0, bandH);
  bandGrad.addColorStop(0, PC.white);
  bandGrad.addColorStop(1, PC.mint);
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, 0, W, bandH);

  // Subtle side accents
  ctx.fillStyle = "rgba(107,191,58,0.08)";
  ctx.fillRect(0, 0, W * 0.08, bandH);
  ctx.fillRect(W * 0.92, 0, W * 0.08, bandH);

  const logoH = bandH * 0.55;
  const logoW = (logo.width / logo.height) * logoH;
  ctx.drawImage(logo, (W - logoW) / 2, (bandH - logoH) / 2, logoW, logoH);

  const dividerH = Math.max(4, Math.round(W * 0.004));
  const divGrad = ctx.createLinearGradient(0, 0, W, 0);
  divGrad.addColorStop(0, PC.greenDark);
  divGrad.addColorStop(0.5, PC.teal);
  divGrad.addColorStop(1, PC.purple);
  ctx.fillStyle = divGrad;
  ctx.fillRect(0, bandH - dividerH, W, dividerH);

  // Soft shadow under band
  ctx.save();
  roundRect(ctx, 0, bandH - 2, W, 8, 0);
  ctx.fillStyle = "rgba(30,58,47,0.06)";
  ctx.fillRect(0, bandH, W, 6);
  ctx.restore();

  ctx.drawImage(img, 0, bandH);

  return canvas.toDataURL("image/png");
}
