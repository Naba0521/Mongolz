const FILENAME = "mongolz.png";

export function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function isInAppBrowser(): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(navigator.userAgent);
}

export async function fetchImageBlob(imageUrl: string): Promise<Blob> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Image not found");
  return res.blob();
}

function toFile(blob: Blob, filename = FILENAME): File {
  return new File([blob], filename, { type: blob.type || "image/png" });
}

function downloadBlob(blob: Blob, filename = FILENAME): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Opens native share sheet with image file. Returns how it ended. */
export async function nativeShareImage(
  blob: Blob,
  opts?: { title?: string; text?: string }
): Promise<"shared" | "unsupported"> {
  if (typeof navigator.share !== "function") return "unsupported";

  const file = toFile(blob);
  const attempts: ShareData[] = [
    { files: [file], title: opts?.title, text: opts?.text },
    { files: [file] },
  ];

  for (const payload of attempts) {
    try {
      if (navigator.canShare && !navigator.canShare(payload)) continue;
      await navigator.share(payload);
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
    }
  }

  return "unsupported";
}

/** Opens native share sheet with URL (Facebook link share). */
export async function nativeShareUrl(
  url: string,
  opts?: { title?: string; text?: string }
): Promise<"shared" | "unsupported"> {
  if (typeof navigator.share !== "function") return "unsupported";

  const payload: ShareData = {
    url,
    title: opts?.title ?? "The MongolZ × Pinecone Academy",
    text: opts?.text ?? "Багтайгаа зургаа татуул",
  };

  try {
    if (navigator.canShare && !navigator.canShare(payload)) {
      return "unsupported";
    }
    await navigator.share(payload);
    return "shared";
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return "unsupported";
  }
}

export function openFacebookSharer(pageUrl: string): void {
  const encoded = encodeURIComponent(pageUrl);
  const mobile = isMobileDevice();
  const url = mobile
    ? `https://m.facebook.com/sharer.php?u=${encoded}`
    : `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
  window.location.href = url;
}

export function openInstagramApp(): void {
  window.location.href = "instagram://app";
}

/** Save image — share sheet on mobile, download on desktop. */
export async function saveImage(dataUrl: string, filename = FILENAME): Promise<void> {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  const result = await nativeShareImage(blob);
  if (result === "unsupported") downloadBlob(blob, filename);
}

export async function shareImageFromUrl(imageUrl: string, filename = FILENAME): Promise<void> {
  const blob = await fetchImageBlob(imageUrl);
  const result = await nativeShareImage(blob);
  if (result === "unsupported") downloadBlob(blob, filename);
}

export function canShareImage(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
