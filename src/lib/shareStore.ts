import fs from "fs/promises";
import path from "path";

interface ShareMeta {
  mime: string;
  expiresAt: number;
}

const SHARE_DIR = path.join(
  process.env.VERCEL ? "/tmp" : process.cwd(),
  ".share-data",
);

async function ensureDir() {
  await fs.mkdir(SHARE_DIR, { recursive: true });
}

function metaPath(id: string) {
  return path.join(SHARE_DIR, `${id}.json`);
}

function imagePath(id: string) {
  return path.join(SHARE_DIR, `${id}.bin`);
}

function isSafeId(id: string) {
  return /^[0-9a-f-]{36}$/i.test(id);
}

export async function setShare(
  id: string,
  data: Buffer,
  mime: string,
  expiresAt: number,
) {
  await ensureDir();
  await fs.writeFile(imagePath(id), data);
  await fs.writeFile(metaPath(id), JSON.stringify({ mime, expiresAt } satisfies ShareMeta));
}

export async function getShare(
  id: string,
): Promise<{ data: Buffer; mime: string } | null> {
  if (!isSafeId(id)) return null;

  try {
    const metaRaw = await fs.readFile(metaPath(id), "utf8");
    const meta = JSON.parse(metaRaw) as ShareMeta;

    if (meta.expiresAt < Date.now()) {
      await deleteShare(id);
      return null;
    }

    const data = await fs.readFile(imagePath(id));
    return { data, mime: meta.mime };
  } catch {
    return null;
  }
}

async function deleteShare(id: string) {
  await Promise.allSettled([
    fs.unlink(metaPath(id)),
    fs.unlink(imagePath(id)),
  ]);
}

export async function purgeExpired() {
  try {
    await ensureDir();
    const files = await fs.readdir(SHARE_DIR);
    const now = Date.now();

    await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          const id = f.replace(/\.json$/, "");
          try {
            const meta = JSON.parse(
              await fs.readFile(path.join(SHARE_DIR, f), "utf8"),
            ) as ShareMeta;
            if (meta.expiresAt < now) await deleteShare(id);
          } catch {
            await deleteShare(id);
          }
        }),
    );
  } catch {
    // directory may not exist yet
  }
}
