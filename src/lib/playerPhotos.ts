import fs from "fs";
import path from "path";
import { PHOTO_EXTENSIONS } from "./players";

const PLAYERS_DIR = path.join(process.cwd(), "public", "players");

/** Player photo (e.g. blitz.png). */
export function findPrimaryPlayerPhoto(playerId: string): string | null {
  for (const ext of PHOTO_EXTENSIONS) {
    const filePath = path.join(PLAYERS_DIR, `${playerId}.${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

/** Photo for composition — same as primary (one PNG per player). */
export function findPlayerPhoto(playerId: string): string | null {
  return findPrimaryPlayerPhoto(playerId);
}

export function mimeTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}
