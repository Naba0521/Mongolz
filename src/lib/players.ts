export type Player = {
  id: string;
  name: string;
  role: string;
};

export const PLAYERS: Player[] = [
  { id: "blitz", name: "bLitz", role: "In-game leader" },
  { id: "techno", name: "Techno", role: "Rifler" },
  { id: "mzinho", name: "mzinho", role: "AWPer" },
  { id: "910", name: "910", role: "Rifler" },
  { id: "cobrazera", name: "Cobrazera", role: "Rifler" },
];

export const PHOTO_EXTENSIONS = ["png", "webp", "jpg", "jpeg"] as const;
