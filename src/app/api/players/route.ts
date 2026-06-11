import { NextResponse } from "next/server";
import path from "path";
import { PLAYERS } from "@/lib/players";
import { findPrimaryPlayerPhoto, findPlayerPhoto } from "@/lib/playerPhotos";

export const dynamic = "force-dynamic";

export async function GET() {
  const players = PLAYERS.map((player) => {
    const primaryPath = findPrimaryPlayerPhoto(player.id);
    const composePath = findPlayerPhoto(player.id);
    return {
      ...player,
      photoUrl: primaryPath ? `/players/${path.basename(primaryPath)}` : null,
      composePhotoUrl: composePath ? `/players/${path.basename(composePath)}` : null,
    };
  });

  return NextResponse.json({ players });
}
