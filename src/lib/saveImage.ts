/** Save image — on iOS/mobile uses Share sheet → "Save Image" → Photos. */
export async function saveImage(dataUrl: string, filename: string): Promise<void> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  await saveBlob(blob, filename);
}

/** Share or save image fetched from a URL (e.g. /api/share/[id]). */
export async function shareImageFromUrl(imageUrl: string, filename: string): Promise<void> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Image not found");
  const blob = await res.blob();
  await saveBlob(blob, filename);
}

async function saveBlob(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type || "image/png" });

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function canShareImage(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (typeof navigator.canShare !== "function") {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }
  try {
    const probe = new File([new Uint8Array([0])], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}
