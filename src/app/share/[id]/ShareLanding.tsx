"use client";

import { useEffect, useState } from "react";
import { canShareImage, shareImageFromUrl } from "@/lib/saveImage";

type Props = {
  id: string;
  pageUrl: string;
};

export default function ShareLanding({ id, pageUrl }: Props) {
  const imageUrl = `/api/share/${id}`;
  const [valid, setValid] = useState<boolean | null>(null);
  const [sharing, setSharing] = useState<"ig" | "fb" | "save" | null>(null);
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    setShareSupported(canShareImage());
  }, []);

  const handleImageError = () => setValid(false);
  const handleImageLoad = () => setValid(true);

  const shareInstagram = async () => {
    setSharing("ig");
    try {
      await shareImageFromUrl(imageUrl, "mongolz.png");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        alert(
          shareSupported
            ? "Share хийхэд алдаа гарлаа."
            : "Instagram-д share хийхийн тулд эхлээд зураг хадгалаад Instagram апп нээнэ үү."
        );
      }
    } finally {
      setSharing(null);
    }
  };

  const shareFacebook = () => {
    setSharing("fb");
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
    window.open(fbUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => setSharing(null), 500);
  };

  const savePhoto = async () => {
    setSharing("save");
    try {
      await shareImageFromUrl(imageUrl, "mongolz.png");
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
      <main className="flex min-h-full flex-col items-center justify-center gap-3 bg-pc-cream p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="hidden"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-pc-mint border-t-pc-green" />
        <p className="text-sm text-pc-text-muted">Ачаалж байна…</p>
      </main>
    );
  }

  if (!valid) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-3 bg-pc-cream p-6 text-center">
        <p className="text-4xl">⏱</p>
        <h1 className="text-xl font-bold text-pc-green-dark">Холбоос хүчингүй болсон</h1>
        <p className="max-w-sm text-sm text-pc-text-muted">
          QR код 30 минутын дараа хүчингүй болдог. Шинэ QR код үүсгэнэ үү.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col bg-pc-cream">
      <div className="h-1 bg-gradient-to-r from-pc-green-dark via-pc-teal to-pc-purple" />

      <header className="flex items-center gap-3 border-b border-pc-border/60 bg-white/90 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/players/pineconeLogo.png"
          alt="Pinecone Academy"
          className="h-9 object-contain"
        />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-pc-purple">
            Pinecone Academy
          </p>
          <p className="text-sm font-bold text-pc-green-dark">× The MongolZ</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-pc-green-dark">Зураг бэлэн 🎉</h1>
          <p className="mt-1 text-sm text-pc-text-muted">Share хийж хадгална уу</p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="The MongolZ зураг"
          className="w-full rounded-2xl border border-pc-border object-contain shadow-md"
        />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={shareInstagram}
            disabled={sharing !== null}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] px-6 py-4 text-base font-bold text-white shadow-md disabled:opacity-50"
          >
            {sharing === "ig" ? "Нээж байна…" : "📸 Instagram-д share"}
          </button>

          <button
            type="button"
            onClick={shareFacebook}
            disabled={sharing !== null}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1877F2] px-6 py-4 text-base font-bold text-white shadow-md disabled:opacity-50"
          >
            {sharing === "fb" ? "Нээж байна…" : "👍 Facebook-д share"}
          </button>

          <button
            type="button"
            onClick={savePhoto}
            disabled={sharing !== null}
            className="w-full rounded-2xl border-2 border-pc-green bg-white px-6 py-3.5 text-base font-semibold text-pc-green-dark disabled:opacity-50"
          >
            {sharing === "save"
              ? "Хадгалж байна…"
              : shareSupported
                ? "📷 Photos-д хадгалах"
                : "⬇ Татаж авах"}
          </button>
        </div>

        <p className="text-center text-xs leading-relaxed text-pc-text-muted">
          Instagram: Share цонхноос <strong>Instagram</strong> сонгоно.
          <br />
          Facebook: холбоос share хийнэ — зураг preview-тэй харагдана.
        </p>
      </div>
    </main>
  );
}
