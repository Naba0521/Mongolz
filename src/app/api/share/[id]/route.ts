import { NextRequest, NextResponse } from "next/server";
import { shareStore } from "@/lib/shareStore";

/** GET /api/share/[id]  — serves the stored image for download */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entry = shareStore.get(id);

  if (!entry || entry.expiresAt < Date.now()) {
    return NextResponse.json({ error: "Not found or expired" }, { status: 404 });
  }

  return new NextResponse(entry.data, {
    headers: {
      "Content-Type": entry.mime,
      "Content-Disposition": `attachment; filename="mongolz.png"`,
      "Cache-Control": "private, max-age=1800",
    },
  });
}
