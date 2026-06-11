export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Зураг ачаалж чадсангүй: ${src}`));
    img.src = src;
  });
}

/** Draws an image to fully cover the given rect (like CSS object-fit: cover). */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Draws an image to fit inside the rect without cropping (like CSS object-fit: contain). */
export function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  letterbox = "#141820"
) {
  ctx.fillStyle = letterbox;
  ctx.fillRect(x, y, w, h);
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Scale image to fit slot width; returns drawn size (top-aligned, no crop). */
export function fitWidthSize(
  img: HTMLImageElement,
  maxW: number
): { dw: number; dh: number } {
  const scale = maxW / img.width;
  return { dw: maxW, dh: img.height * scale };
}

/** Draw image scaled to slot width, top-aligned, no letterbox gap below. */
export function drawFitWidthTop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  maxW: number
): number {
  const { dw, dh } = fitWidthSize(img, maxW);
  ctx.drawImage(img, x, y, dw, dh);
  return dh;
}

export type PlayerForCompose = {
  name: string;
  photoUrl: string | null;
};
