import { loadImage, drawFitWidthTop, fitWidthSize, type PlayerForCompose } from "./canvasUtils";
import { CANVAS_W, PC } from "./pineconeBrand";

const W = CANVAS_W;
const INFO_H = 200;
const NAMEPLATE_H = 36;
const PLACEHOLDER_PHOTO_H = 160;
const MONGOLZ_LOGO = "/players/mongolzLogo.png";

const BANNER_BG = "#1a1f28";
const ACCENT_BLUE = "#3b82f6";

type Member = {
  name: string;
  img: HTMLImageElement | null;
  isUser: boolean;
};

export function resolveUserDisplayName(name?: string): string {
  const trimmed = name?.trim();
  return trimmed || "YOU";
}

/**
 * HLTV team page banner — 5 players + user as 6th in one row,
 * white info section below. Banner height fits photos tightly.
 */
export async function composeBooth(
  cutoutUrl: string,
  players: PlayerForCompose[],
  userName?: string
): Promise<string> {
  const displayName = resolveUserDisplayName(userName);

  const playerImages = await Promise.all(
    players.map((p) => (p.photoUrl ? loadImage(p.photoUrl) : null))
  );
  const cutout = await loadImage(cutoutUrl);

  let teamLogo: HTMLImageElement | null = null;
  try {
    teamLogo = await loadImage(MONGOLZ_LOGO);
  } catch {
    teamLogo = null;
  }

  const members: Member[] = [
    ...players.map((p, i) => ({ name: p.name, img: playerImages[i], isUser: false })),
    { name: displayName, img: cutout, isUser: true },
  ];

  const n = members.length;
  const slotW = W / n;
  const photoH = computePhotoH(members, slotW);
  const bannerH = photoH + NAMEPLATE_H;
  const H = bannerH + INFO_H;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  drawPlayerBanner(ctx, members, slotW, photoH, bannerH);
  drawInfoSection(ctx, members.length, displayName, bannerH, H, teamLogo);

  return canvas.toDataURL("image/png");
}

function computePhotoH(members: Member[], slotW: number): number {
  let maxH = PLACEHOLDER_PHOTO_H;
  for (const m of members) {
    if (m.img) {
      const { dh } = fitWidthSize(m.img, slotW);
      maxH = Math.max(maxH, dh);
    }
  }
  return Math.ceil(maxH);
}

function drawPlayerBanner(
  ctx: CanvasRenderingContext2D,
  members: Member[],
  slotW: number,
  photoH: number,
  bannerH: number
) {
  ctx.fillStyle = BANNER_BG;
  ctx.fillRect(0, 0, W, bannerH);

  members.forEach((member, i) => {
    const x = i * slotW;
    drawBannerMember(ctx, member, x, slotW, photoH, bannerH);
  });
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  font: string
): string {
  ctx.font = font;
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

function drawBannerMember(
  ctx: CanvasRenderingContext2D,
  member: Member,
  x: number,
  slotW: number,
  photoH: number,
  bannerH: number
) {
  const { name, img, isUser } = member;
  const nameplateY = photoH;

  if (isUser) {
    ctx.fillStyle = "rgba(107,191,58,0.06)";
    ctx.fillRect(x, 0, slotW, bannerH);
    ctx.fillStyle = PC.green;
    ctx.fillRect(x + slotW - 3, 0, 3, bannerH);
  }

  if (img) {
    drawFitWidthTop(ctx, img, x, 0, slotW);
  } else {
    ctx.fillStyle = "#252b36";
    ctx.fillRect(x, 0, slotW, PLACEHOLDER_PHOTO_H);
    ctx.fillStyle = "#666";
    ctx.font = `bold ${slotW * 0.3}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name[0]?.toUpperCase() ?? "?", x + slotW / 2, PLACEHOLDER_PHOTO_H / 2);
    ctx.textBaseline = "alphabetic";
  }

  ctx.fillStyle = isUser ? "rgba(45,138,78,0.88)" : "rgba(0,0,0,0.72)";
  ctx.fillRect(x, nameplateY, slotW, NAMEPLATE_H);

  const flagW = 22;
  const flagH = 14;
  const flagX = x + 8;
  const flagY = nameplateY + (NAMEPLATE_H - flagH) / 2;
  drawMongolianFlag(ctx, flagX, flagY, flagW, flagH);

  const nameFont = `900 ${isUser ? 15 : 14}px 'Arial Black', Arial, sans-serif`;
  const maxNameW = slotW - flagW - 16 - (isUser ? 36 : 8);
  const displayName = truncateText(ctx, name, maxNameW, nameFont);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = nameFont;
  ctx.fillText(displayName, flagX + flagW + 6, nameplateY + NAMEPLATE_H / 2 + 5);

  if (isUser) {
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "700 10px Arial, sans-serif";
    ctx.fillText("NEW", x + slotW - 10, nameplateY + 14);
  }
}

function drawTeamLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  cx: number,
  cy: number,
  r: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const size = r * 2;
  const scale = Math.max(size / logo.width, size / logo.height);
  const dw = logo.width * scale;
  const dh = logo.height * scale;
  ctx.drawImage(logo, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawInfoSection(
  ctx: CanvasRenderingContext2D,
  rosterSize: number,
  userDisplayName: string,
  infoTop: number,
  H: number,
  teamLogo: HTMLImageElement | null
) {
  ctx.fillStyle = ACCENT_BLUE;
  ctx.fillRect(0, infoTop, W, 3);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, infoTop + 3, W, H - infoTop - 3);

  const y0 = infoTop + 10;

  const logoR = 24;
  const logoCx = 40;
  const logoCy = y0 + logoR;

  if (teamLogo) {
    drawTeamLogo(ctx, teamLogo, logoCx, logoCy, logoR);
  } else {
    ctx.beginPath();
    ctx.arc(logoCx, logoCy, logoR, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1f28";
    ctx.fill();
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#c9a227";
    ctx.font = "900 16px 'Arial Black', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MZ", logoCx, logoCy);
    ctx.textBaseline = "alphabetic";
  }

  const textX = 80;
  drawMongolianFlag(ctx, textX, y0 + 2, 18, 12);
  ctx.fillStyle = "#888";
  ctx.font = "600 11px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Mongolia", textX + 26, y0 + 12);

  ctx.fillStyle = "#111";
  ctx.font = "900 24px 'Arial Black', Arial, sans-serif";
  ctx.fillText("The MongolZ", textX, y0 + 36);

  const rows: [string, string][] = [
    ["World ranking", "#9"],
    ["Roster size", String(rosterSize)],
    ["New member", `${userDisplayName} ✓`],
  ];

  let rowY = y0 + logoR * 2 + 12;
  rows.forEach(([label, value], i) => {
    if (i > 0) {
      ctx.strokeStyle = "#eee";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, rowY - 6);
      ctx.lineTo(W - 24, rowY - 6);
      ctx.stroke();
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "#555";
    ctx.font = "600 13px Arial, sans-serif";
    ctx.fillText(label, 28, rowY + 5);

    ctx.textAlign = "right";
    ctx.fillStyle = i === 2 ? PC.greenDark : ACCENT_BLUE;
    ctx.font = i === 2 ? "700 13px Arial, sans-serif" : "900 15px 'Arial Black', Arial, sans-serif";
    ctx.fillText(value, W - 28, rowY + 5);

    rowY += 30;
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#aaa";
  ctx.font = "600 10px Arial, sans-serif";
  ctx.fillText("PINECONE ACADEMY · ME × THE MONGOLZ", W / 2, H - 10);
}

function drawMongolianFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const t = w / 3;
  ctx.fillStyle = "#da2032";
  ctx.fillRect(x, y, t, h);
  ctx.fillStyle = "#0066b3";
  ctx.fillRect(x + t, y, t, h);
  ctx.fillStyle = "#da2032";
  ctx.fillRect(x + t * 2, y, t, h);
  ctx.beginPath();
  ctx.arc(x + t / 2, y + h / 2, h * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "#f9cf02";
  ctx.fill();
}
