import { loadImage } from "./canvasUtils";

const LOGO_SRC = "/players/logo.png";
const GOLD = "#d4af37";

/**
 * Adds a white header band with the academy logo above the image.
 * Returns the original image unchanged if the logo can't be loaded,
 * so generation never fails because of branding.
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
  const bandH = Math.round(W * 0.12);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = img.height + bandH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, bandH);

  // Logo centered inside the band
  const logoH = bandH * 0.58;
  const logoW = (logo.width / logo.height) * logoH;
  ctx.drawImage(logo, (W - logoW) / 2, (bandH - logoH) / 2, logoW, logoH);

  // Thin gold divider between the band and the image
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, bandH - Math.max(3, Math.round(W * 0.004)), W, Math.max(3, Math.round(W * 0.004)));

  ctx.drawImage(img, 0, bandH);

  return canvas.toDataURL("image/png");
}
