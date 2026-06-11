"use client";

import { useEffect, useState } from "react";
import {
  fetchImageBlob,
  isInAppBrowser,
  isMobileDevice,
  nativeShareImage,
  nativeShareUrl,
  openFacebookSharer,
  openInstagramApp,
} from "@/lib/saveImage";

type Props = {
  id: string;
  pageUrl: string;
};

type Hint = "instagram" | "facebook" | null;

export default function ShareLanding({ id, pageUrl }: Props) {
  const apiImageUrl = `/api/share/${id}`;
  const [valid, setValid] = useState<boolean | null>(null);
  const [sharing, setSharing] = useState<"ig" | "fb" | "save" | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [hint, setHint] = useState<Hint>(null);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setInApp(isInAppBrowser());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadShare() {
      try {
        const res = await fetch(apiImageUrl);
        if (!res.ok) {
          if (!cancelled) setValid(false);
          return;
        }
        const blob = await res.blob();
        if (!cancelled) {
          setImageBlob(blob);
          setValid(true);
        }
      } catch {
        if (!cancelled) setValid(false);
      }
    }

    void loadShare();
    return () => {
      cancelled = true;
    };
  }, [apiImageUrl]);

  const getBlob = async (): Promise<Blob> => {
    if (imageBlob) return imageBlob;
    const blob = await fetchImageBlob(apiImageUrl);
    setImageBlob(blob);
    return blob;
  };

  const shareInstagram = async () => {
    setSharing("ig");
    setHint(null);
    try {
      const blob = await getBlob();
      const result = await nativeShareImage(blob, {
        title: "The MongolZ",
        text: "The MongolZ",
      });

      if (result === "unsupported") {
        setHint("instagram");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setHint("instagram");
      }
    } finally {
      setSharing(null);
    }
  };

  const shareFacebook = async () => {
    setSharing("fb");
    setHint(null);
    try {
      const blob = await getBlob();

      const fileResult = await nativeShareImage(blob, {
        title: "The MongolZ",
        text: "The MongolZ",
      });
      if (fileResult === "shared") return;

      const urlResult = await nativeShareUrl(pageUrl, {
        title: "The MongolZ",
      });
      if (urlResult === "shared") return;

      if (pageUrl.startsWith("http")) {
        openFacebookSharer(pageUrl);
        return;
      }

      setHint("facebook");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setHint("facebook");
      }
    } finally {
      setSharing(null);
    }
  };

  const savePhoto = async () => {
    setSharing("save");
    try {
      const blob = await getBlob();
      const result = await nativeShareImage(blob);
      if (result === "unsupported") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mongolz.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        alert("Зураг хадгалахад алдаа гарлаа.");
      }
    } finally {
      setSharing(null);
    }
  };

  if (valid === null) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-3 bg-zinc-950 p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-amber-400" />
        <p className="text-sm text-zinc-400">Ачаалж байна…</p>
      </main>
    );
  }

  if (!valid) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center">
        <p className="text-4xl">⏱</p>
        <h1 className="text-xl font-bold text-zinc-100">Холбоос хүчингүй болсон</h1>
        <p className="max-w-sm text-sm text-zinc-400">
          QR код 30 минутын дараа хүчингүй болдог. Шинэ QR код үүсгээрэй.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col bg-zinc-950">
      <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex shrink-0 items-center justify-center rounded-lg bg-white px-2.5 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/players/logo.png"
            alt="The MongolZ"
            className="h-8 object-contain"
          />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            The MongolZ
          </p>
          <p className="text-sm font-bold text-zinc-100">Fan Photo</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-4">
        {inApp && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            If sharing doesn&apos;t work in the Instagram/Facebook app, open in{" "}
            <strong>Safari</strong> or <strong>Chrome</strong>.
          </div>
        )}

        <div className="text-center">
          <h1 className="text-lg font-bold text-zinc-100">Таны зураг бэлэн 🎉</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Tap Share and choose Instagram or Facebook
          </p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={apiImageUrl}
          alt="The MongolZ зураг"
          className="w-full rounded-2xl border border-zinc-800 object-contain shadow-md"
        />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={savePhoto}
            disabled={sharing !== null}
            className="w-full rounded-2xl bg-amber-500 px-6 py-4 text-base font-bold text-zinc-950 shadow-md hover:bg-amber-400 disabled:opacity-50"
          >
            {sharing === "save"
              ? "Хадгалж байна…"
              : isMobileDevice()
                ? "📷 Save to Photos"
                : "⬇ Татаж авах"}
          </button>

          <button
            type="button"
            onClick={shareInstagram}
            disabled={sharing !== null}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] px-6 py-4 text-base font-bold text-white shadow-md disabled:opacity-50"
          >
            {sharing === "ig" ? "Opening…" : "📸 Share on Instagram"}
          </button>

          <button
            type="button"
            onClick={shareFacebook}
            disabled={sharing !== null}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1877F2] px-6 py-4 text-base font-bold text-white shadow-md disabled:opacity-50"
          >
            {sharing === "fb" ? "Opening…" : "👍 Share on Facebook"}
          </button>
        </div>

        {hint === "instagram" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-200">
            <p className="font-semibold">Share on Instagram:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-zinc-400">
              <li>Tap &quot;Save to Photos&quot; above</li>
              <li>
                Open the{" "}
                <button
                  type="button"
                  onClick={openInstagramApp}
                  className="font-semibold text-[#bc1888] underline"
                >
                  Instagram
                </button>{" "}
                app
              </li>
              <li>Story or Post → pick the image from Gallery</li>
            </ol>
          </div>
        )}

        {hint === "facebook" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-200">
            <p className="font-semibold">Share on Facebook:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-zinc-400">
              <li>Save the image to Photos first</li>
              <li>Open Facebook and create a new post</li>
              <li>Pick the image from Gallery</li>
            </ol>
          </div>
        )}

        <p className="text-center text-xs leading-relaxed text-zinc-500">
          Save to Photos: choose <strong>Save Image</strong> in the share sheet.
          <br />
          Instagram / Facebook: pick your app from the share sheet.
        </p>
      </div>
    </main>
  );
}
