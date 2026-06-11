import fs from "fs";
import path from "path";
import { PHOTO_EXTENSIONS } from "./players";

const PLAYERS_DIR = path.join(process.cwd(), "public", "players");

/** Returns the absolute file path of a player's reference photo, or null if not added yet. */
export function findPlayerPhoto(playerId: string): string | null {
  for (const ext of PHOTO_EXTENSIONS) {
    const filePath = path.join(PLAYERS_DIR, `${playerId}.${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

export function mimeTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}
