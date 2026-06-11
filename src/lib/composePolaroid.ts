import { loadImage, drawCover, type PlayerForCompose } from "./canvasUtils";
import {
  CANVAS_H,
  CANVAS_W,
  PC,
  drawAcademyBackground,
  drawPosterFooter,
  drawPosterHeader,
  roundRect,
} from "./pineconeBrand";

const W = CANVAS_W;
const H = CANVAS_H;
const HAND_FONT = "'Marker Felt', 'Bradley Hand', 'Comic Sans MS', cursive";

const HEADER_BOTTOM = 118;
const FOOTER_H = 78;
const WALL_TOP = HEADER_BOTTOM + 16;
const WALL_BOTTOM = H - FOOTER_H - 16;

type PolaroidItem = {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  img: HTMLImageElement | null;
  caption: string;
  isUser: boolean;
  z: number;
};

/** Fan wall — centered hero polaroid + players around it. */
export async function composePolaroid(
  userPhotoUrl: string,
  players: PlayerForCompose[]
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  drawAcademyBackground(ctx, W, H);
  drawPosterHeader(ctx, W, "PINECONE ACADEMY · FAN WALL");
  drawWallPanel(ctx);

  const playerImages = await Promise.all(
    players.map((p) => (p.photoUrl ? loadImage(p.photoUrl) : null))
  );
  const userImg = await loadImage(userPhotoUrl);

  const playerSlots: [number, number, number, number, number][] = [
    [36, WALL_TOP + 20, 290, 360, -9],
    [754, WALL_TOP + 10, 290, 360, 8],
    [24, WALL_TOP + 420, 270, 340, 6],
    [786, WALL_TOP + 410, 270, 340, -7],
    [400, WALL_TOP + 520, 280, 340, 4],
  ];

  const items: PolaroidItem[] = players.map((player, i) => {
    const [x, y, pw, ph, rot] = playerSlots[i % playerSlots.length];
    // Top-corner slots go behind the user; lower slots go in front
    const z = y < WALL_TOP + 300 ? 1 : 20;
    return { x, y, w: pw, h: ph, rot, img: playerImages[i], caption: player.name, isUser: false, z };
  });

  items.push({
    x: (W - 480) / 2,
    y: WALL_TOP + 60,
    w: 480,
    h: 580,
    rot: -1.5,
    img: userImg,
    caption: "ME ★",
    isUser: true,
    z: 10,
  });

  items
    .sort((a, b) => a.z - b.z)
    .forEach((item) =>
      drawPolaroid(ctx, item.img, item.x, item.y, item.w, item.h, item.rot, item.caption, item.isUser)
    );

  drawPosterFooter(ctx, W, H, "ME × THE MONGOLZ", FOOTER_H);

  return canvas.toDataURL("image/png");
}

function drawWallPanel(ctx: CanvasRenderingContext2D) {
  const pad = 16;
  ctx.save();
  ctx.shadowColor = "rgba(30,58,47,0.1)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, pad, WALL_TOP, W - pad * 2, WALL_BOTTOM - WALL_TOP, 20);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fill();
  ctx.restore();

  roundRect(ctx, pad, WALL_TOP, W - pad * 2, WALL_BOTTOM - WALL_TOP, 20);
  ctx.strokeStyle = "rgba(107,191,58,0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Subtle cork texture inside wall
  ctx.save();
  roundRect(ctx, pad, WALL_TOP, W - pad * 2, WALL_BOTTOM - WALL_TOP, 20);
  ctx.clip();
  ctx.fillStyle = "rgba(45,138,78,0.05)";
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    ctx.arc(
      pad + Math.random() * (W - pad * 2),
      WALL_TOP + Math.random() * (WALL_BOTTOM - WALL_TOP),
      1.5 + Math.random() * 2, 0, Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawPolaroid(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number, y: number, w: number, h: number,
  rotationDeg: number,
  caption: string,
  isUser = false
) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  ctx.save();
  ctx.shadowColor = isUser ? "rgba(46,196,182,0.35)" : "rgba(30,58,47,0.22)";
  ctx.shadowBlur = isUser ? 32 : 20;
  ctx.shadowOffsetY = isUser ? 14 : 8;
  ctx.fillStyle = PC.white;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  if (isUser) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, PC.green);
    g.addColorStop(0.5, PC.teal);
    g.addColorStop(1, PC.purple);
    ctx.strokeStyle = g;
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, w - 6, h - 6);
  }

  const margin = w * 0.055;
  const photoH = h - margin * 2 - h * 0.14;
  if (img) {
    drawCover(ctx, img, margin, margin, w - margin * 2, photoH);
  } else {
    ctx.fillStyle = PC.mint;
    ctx.fillRect(margin, margin, w - margin * 2, photoH);
    ctx.fillStyle = PC.textMuted;
    ctx.font = `bold ${w * 0.28}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(caption[0], w / 2, margin + photoH / 2);
    ctx.textBaseline = "alphabetic";
  }

  ctx.fillStyle = isUser ? PC.greenDark : PC.text;
  ctx.font = `${isUser ? 700 : 600} ${w * (isUser ? 0.08 : 0.1)}px ${HAND_FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(caption, w / 2, h - h * 0.05);

  drawPin(ctx, w / 2, -6, isUser);
  drawTape(ctx, w, rotationDeg, isUser);

  ctx.restore();
}

function drawPin(ctx: CanvasRenderingContext2D, cx: number, cy: number, isUser: boolean) {
  ctx.beginPath();
  ctx.arc(cx, cy, isUser ? 9 : 7, 0, Math.PI * 2);
  ctx.fillStyle = isUser ? PC.teal : PC.purple;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 2, isUser ? 3 : 2.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fill();
}

function drawTape(ctx: CanvasRenderingContext2D, w: number, rotationDeg: number, isUser: boolean) {
  ctx.save();
  ctx.translate(w / 2, 0);
  ctx.rotate((Math.PI / 180) * (rotationDeg > 0 ? -3 : 3));
  ctx.fillStyle = isUser ? "rgba(46,196,182,0.5)" : "rgba(123,79,212,0.3)";
  ctx.fillRect(-w * 0.16, -14, w * 0.32, 28);
  ctx.restore();
}
