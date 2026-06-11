import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { purgeExpired, setShare } from "@/lib/shareStore";

/** POST /api/share
 *  Body: { image: "data:image/png;base64,..." }
 *  Returns: { id, url }  — valid for 30 minutes
 */
export async function POST(request: NextRequest) {
  await purgeExpired();

  const { image } = (await request.json()) as { image?: string };
  if (!image?.startsWith("data:")) {
    return NextResponse.json({ error: "image field required" }, { status: 400 });
  }

  const [header, b64] = image.split(",");
  const mime = header.replace("data:", "").replace(";base64", "") || "image/png";
  const data = Buffer.from(b64, "base64");

  const id = randomUUID();
  const expiresAt = Date.now() + 30 * 60 * 1000;
  await setShare(id, data, mime, expiresAt);

  const { origin } = new URL(request.url);
  return NextResponse.json({ id, url: `${origin}/share/${id}` });
}
