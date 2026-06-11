import { NextResponse } from "next/server";

export const maxDuration = 60;

const BG_PROMPT =
  "Empty esports tournament arena stage at night in anime illustration style, huge LED screen with golden light, " +
  "cheering crowd silhouettes in the dark background, dramatic spotlights, vibrant cel shading, " +
  "empty space in the center foreground for people to stand, no people, no text, high quality anime key visual";

/**
 * Generates a photorealistic arena background via the ImagineArt API
 * (https://www.imagine.art/gen-api). Requires IMAGINE_API_KEY in .env.local.
 * Returns 503 when unavailable so the client can fall back to a locally drawn backdrop.
 */
export async function GET() {
  const apiKey = process.env.IMAGINE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "IMAGINE_API_KEY тохируулаагүй байна." },
      { status: 503 },
    );
  }

  try {
    const formData = new FormData();
    formData.append("prompt", BG_PROMPT);
    formData.append("style", "anime");
    formData.append("aspect_ratio", "9:16");

    const res = await fetch("https://api.vyro.ai/v2/image/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: AbortSignal.timeout(50_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("ImagineArt error:", res.status, detail);
      return NextResponse.json(
        { error: `ImagineArt API алдаа (${res.status}).` },
        { status: 503 },
      );
    }

    // Success response body is raw image bytes.
    const bytes = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/png";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("ImagineArt request failed:", err);
    return NextResponse.json(
      { error: "ImagineArt-тай холбогдож чадсангүй." },
      { status: 503 },
    );
  }
}
