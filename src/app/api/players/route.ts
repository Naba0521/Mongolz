import { NextResponse } from "next/server";
import path from "path";
import { PLAYERS } from "@/lib/players";
import { findPlayerPhoto } from "@/lib/playerPhotos";

export const dynamic = "force-dynamic";

export async function GET() {
  const players = PLAYERS.map((player) => {
    const photoPath = findPlayerPhoto(player.id);
    return {
      ...player,
      photoUrl: photoPath ? `/players/${path.basename(photoPath)}` : null,
    };
  });

  return NextResponse.json({ players });
}
