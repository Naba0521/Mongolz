import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { PLAYERS } from "@/lib/players";
import { findPlayerPhoto, mimeTypeFor } from "@/lib/playerPhotos";

export const maxDuration = 120;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const LEONARDO_BASE = "https://cloud.leonardo.ai/api/rest";

// Nano Banana 2 — Illustration style (anime)
const STYLE_ILLUSTRATION = "645e4195-f63d-4715-a3f2-3fb1e6eb8c70";

const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) { requestLog.set(ip, recent); return true; }
  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

function buildPrompt(playerName: string): string {
  return [
    "Anime illustration of exactly TWO people standing side by side, posing together for a fan photo.",
    `Left person: a fan. Right person: ${playerName}, a professional Counter-Strike player from The MongolZ esports team.`,
    "Both face the viewer, smiling, shoulder to shoulder.",
    `CRITICAL: ${playerName}'s face must be an exact match to the second reference image — same eye shape, nose, lips, jawline, skin tone, and hairstyle. Do NOT change or idealize ${playerName}'s face. Reproduce it faithfully in anime style.`,
    "The fan's face must also closely match the first reference image.",
    `${playerName} wears The MongolZ black jersey with gold accents.`,
    "Background: esports arena with golden LED lights and crowd silhouettes, blurred.",
    "High-quality anime key visual, vibrant cel shading, clean line art.",
  ].join(" ");
}

function extFromMime(mime: string): "jpg" | "png" | "webp" {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

/**
 * Step 1 — get S3 presigned URL from Leonardo, then upload the image bytes.
 * Returns the image ID to use as a reference in generation.
 */
async function uploadImage(buffer: Buffer, mime: string, apiKey: string): Promise<string> {
  const ext = extFromMime(mime);

  // 1a. Get presigned URL
  const initRes = await fetch(`${LEONARDO_BASE}/v1/init-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ extension: ext }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!initRes.ok) {
    const err = await initRes.text().catch(() => "");
    throw new Error(`init-image ${initRes.status}: ${err}`);
  }
  const { uploadInitImage } = (await initRes.json()) as {
    uploadInitImage: { id: string; url: string; fields: string };
  };

  // 1b. Upload to S3 presigned URL
  const fields = JSON.parse(uploadInitImage.fields) as Record<string, string>;
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  form.append("file", new Blob([ab], { type: mime }));

  const s3Res = await fetch(uploadInitImage.url, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(25_000),
  });
  // S3 presigned POST returns 204 on success
  if (!s3Res.ok && s3Res.status !== 204) {
    throw new Error(`S3 upload ${s3Res.status}`);
  }

  return uploadInitImage.id;
}

/**
 * Step 2 — start a generation using both uploaded image IDs as references.
 * Returns the generationId.
 */
async function startGeneration(
  userImageId: string,
  playerImageId: string,
  playerName: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(`${LEONARDO_BASE}/v2/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nano-banana-2",
      public: false,
      parameters: {
        prompt: buildPrompt(playerName),
        width: 1024,
        height: 1024,
        quantity: 1,
        prompt_enhance: "OFF",
        style_ids: [STYLE_ILLUSTRATION],
        guidances: {
          image_reference: [
            { image: { id: userImageId,   type: "UPLOADED" }, strength: "MID"  },
            { image: { id: playerImageId, type: "UPLOADED" }, strength: "HIGH" },
          ],
        },
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`generate ${res.status}: ${err}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  console.log("[Leonardo] generate response:", JSON.stringify(data));

  // v2 wraps generationId inside { generate: { generationId } }
  const generationId =
    (data.generate as { generationId?: string } | undefined)?.generationId ??
    (data.sdGenerationJob as { generationId?: string } | undefined)?.generationId ??
    (data.generationId as string | undefined);

  if (!generationId) throw new Error(`no generationId in: ${JSON.stringify(data)}`);
  return generationId;
}

/**
 * Step 3 — poll GET /v1/generations/{id} until status is COMPLETE or FAILED.
 * Returns base64 data URL of the first generated image.
 */
async function pollForImage(generationId: string, apiKey: string): Promise<string> {
  // Poll every 3 s for up to 90 s (30 attempts)
  for (let attempt = 1; attempt <= 30; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));

    const res = await fetch(`${LEONARDO_BASE}/v1/generations/${generationId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    }).catch((e: unknown) => { console.error("[Leonardo] poll fetch error:", e); return null; });

    if (!res?.ok) {
      console.log(`[Leonardo] poll #${attempt} — HTTP ${res?.status ?? "error"}`);
      continue;
    }

    const data = (await res.json()) as {
      generations_by_pk?: {
        status: string;
        generated_images?: Array<{ url: string; id: string }>;
      };
    };
    const gen = data.generations_by_pk;
    console.log(`[Leonardo] poll #${attempt} — status: ${gen?.status ?? "no data"}`);

    if (!gen) continue;
    if (gen.status === "FAILED") throw new Error("Leonardo: generation FAILED");

    if (gen.status === "COMPLETE") {
      const imageUrl = gen.generated_images?.[0]?.url;
      if (!imageUrl) throw new Error("COMPLETE but no image URL");

      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) });
      const imgBuf = await imgRes.arrayBuffer();
      const base64 = Buffer.from(imgBuf).toString("base64");
      const ct = imgRes.headers.get("content-type") ?? "image/jpeg";
      return `data:${ct};base64,${base64}`;
    }
    // status === "PENDING" → keep waiting
  }

  throw new Error("Leonardo: timed out after 90 s");
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "LEONARDO_API_KEY тохируулаагүй байна.", fallback: false },
      { status: 500 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Хэт олон хүсэлт. Жоохон хүлээгээд дахин оролдоно уу.", fallback: false },
      { status: 429 },
    );
  }

  let formData: FormData;
  try { formData = await request.formData(); }
  catch {
    return NextResponse.json({ error: "Хүсэлт буруу байна.", fallback: false }, { status: 400 });
  }

  const photo    = formData.get("photo");
  const playerId = String(formData.get("player") ?? "");

  if (!(photo instanceof File) || !photo.type.startsWith("image/")) {
    return NextResponse.json({ error: "Зураг оруулна уу.", fallback: false }, { status: 400 });
  }
  if (photo.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Зураг хэтэрхий том (дээд тал нь 8MB).", fallback: false },
      { status: 400 },
    );
  }

  const player = PLAYERS.find((p) => p.id === playerId);
  if (!player) {
    return NextResponse.json({ error: "Нэг тоглогч сонгоно уу.", fallback: false }, { status: 400 });
  }

  const photoPath = findPlayerPhoto(player.id);
  if (!photoPath) {
    return NextResponse.json(
      { error: `${player.name}-ийн зураг олдсонгүй. public/players/${player.id}.jpg нэмнэ үү.`, fallback: false },
      { status: 400 },
    );
  }

  try {
    const [playerPhoto, userBuffer] = await Promise.all([
      fs.readFile(photoPath),
      photo.arrayBuffer().then((ab) => Buffer.from(ab)),
    ]);

    // Upload both photos in parallel
    const [userImageId, playerImageId] = await Promise.all([
      uploadImage(userBuffer,    photo.type,            apiKey),
      uploadImage(playerPhoto,   mimeTypeFor(photoPath), apiKey),
    ]);

    const generationId = await startGeneration(userImageId, playerImageId, player.name, apiKey);
    const image        = await pollForImage(generationId, apiKey);

    return NextResponse.json({ image });
  } catch (err) {
    console.error("[Leonardo] failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Алдаа гарлаа: ${msg}`, fallback: false }, { status: 502 });
  }
}
