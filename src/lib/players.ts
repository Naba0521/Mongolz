export type Player = {
  id: string;
  name: string;
  role: string;
};

export const PLAYERS: Player[] = [
  { id: "blitz", name: "bLitz", role: "In-game leader" },
  { id: "techno", name: "Techno", role: "Entry fragger" },
  { id: "mzinho", name: "mzinho", role: "Rifler" },
  { id: "910", name: "910", role: "AWPer" },
  { id: "cobrazera", name: "Cobrazera", role: "Rifler" },
];

export const PHOTO_EXTENSIONS = ["png", "webp", "jpg", "jpeg"] as const;
