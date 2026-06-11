import { loadImage, drawCover, type PlayerForCompose } from "./canvasUtils";

const W = 1080;
const H = 1350;
const GOLD = "#d4af37";
const HAND_FONT = "'Marker Felt', 'Bradley Hand', 'Comic Sans MS', cursive";

/**
 * Fan wall collage: player polaroids pinned around the edges,
 * the user's polaroid front and center.
 */
export async function composePolaroid(
  userPhotoUrl: string,
  players: PlayerForCompose[]
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  drawBackground(ctx);

  const playerImages = await Promise.all(
    players.map((p) => (p.photoUrl ? loadImage(p.photoUrl) : null))
  );

  // Up to 5 slots around the edges: x, y, rotation (degrees)
  const slots: [number, number, number][] = [
    [30, 60, -8],
    [685, 45, 7],
    [358, 30, 3],
    [25, 855, 6],
    [690, 870, -7],
  ];

  players.forEach((player, i) => {
    const [x, y, rot] = slots[i % slots.length];
    drawPolaroid(ctx, playerImages[i], x, y, 365, 445, rot, player.name);
  });

  const userImg = await loadImage(userPhotoUrl);
  drawPolaroid(ctx, userImg, (W - 460) / 2, 450, 460, 575, -2, "ME ★", true);

  drawFooter(ctx);

  return canvas.toDataURL("image/png");
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#221c16");
  g.addColorStop(1, "#15110d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Subtle texture dots
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let i = 0; i < 350; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 950);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // Faint background title
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "rgba(212,175,55,0.06)";
  ctx.font = "900 160px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MONGOLZ", 0, 60);
  ctx.restore();
}

function drawPolaroid(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg: number,
  caption: string,
  isUser = false
) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  // White frame with shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#f8f5ee";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Photo area
  const margin = w * 0.06;
  const photoH = h - margin * 2 - h * 0.16;
  if (img) {
    drawCover(ctx, img, margin, margin, w - margin * 2, photoH);
  } else {
    ctx.fillStyle = "#d8d2c4";
    ctx.fillRect(margin, margin, w - margin * 2, photoH);
    ctx.fillStyle = "#9a9384";
    ctx.font = `bold ${w * 0.3}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(caption[0], w / 2, margin + photoH / 2);
    ctx.textBaseline = "alphabetic";
  }

  // Caption
  ctx.fillStyle = isUser ? "#9a7b1a" : "#3a352c";
  ctx.font = `${isUser ? 700 : 600} ${w * (isUser ? 0.085 : 0.11)}px ${HAND_FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(caption, w / 2, h - h * 0.055);

  // Tape strip on top
  ctx.save();
  ctx.translate(w / 2, 0);
  ctx.rotate((Math.PI / 180) * (rotationDeg > 0 ? -4 : 4));
  ctx.fillStyle = "rgba(228, 211, 160, 0.55)";
  ctx.fillRect(-w * 0.18, -16, w * 0.36, 34);
  ctx.restore();

  ctx.restore();
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = "900 44px 'Arial Black', Arial, sans-serif";
  ctx.fillText("THE MONGOLZ • FAN WALL", W / 2, H - 60);
}
