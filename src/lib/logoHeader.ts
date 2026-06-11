import { loadImage } from "./canvasUtils";
import { PC } from "./pineconeBrand";

const LOGO_SRC = "/players/logo.png";

/** Adds a dark header band with team logo above the image. */
export async function addLogoHeader(dataUrl: string): Promise<string> {
  let logo: HTMLImageElement;
  try {
    logo = await loadImage(LOGO_SRC);
  } catch {
    return dataUrl;
  }

  const img = await loadImage(dataUrl);
  const W = img.width;
  const bandH = Math.round(W * 0.1);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = img.height + bandH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = PC.bgPanel;
  ctx.fillRect(0, 0, W, bandH);

  ctx.fillStyle = PC.gold;
  ctx.fillRect(0, bandH - 3, W, 3);

  const logoH = bandH * 0.5;
  const logoW = (logo.width / logo.height) * logoH;
  const pad = bandH * 0.1;
  const boxW = logoW + pad * 2;
  const boxH = logoH + pad * 2;
  const boxX = (W - boxW) / 2;
  const boxY = (bandH - boxH) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, pad * 0.6);
  ctx.fill();

  ctx.drawImage(logo, boxX + pad, boxY + pad, logoW, logoH);

  ctx.drawImage(img, 0, bandH);

  return canvas.toDataURL("image/png");
}
