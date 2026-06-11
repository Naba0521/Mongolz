"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type PlayerWithPhoto = {
  id: string;
  name: string;
  role: string;
  photoUrl: string | null;
};

type Mode = "booth" | "polaroid" | "ai";

const MODES: { id: Mode; label: string; description: string }[] = [
  {
    id: "booth",
    label: "Photo Booth",
    description: "Fan Zone постер — таны зураг тоглогчдын дунд",
  },
  {
    id: "polaroid",
    label: "Polaroid коллаж",
    description: "Fan wall — polaroid зургуудын хана",
  },
  {
    id: "ai",
    label: "AI зураг",
    description: "Нэг тоглогчтой хамт зогсож зургаа татуулсан мэт зураг",
  },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("booth");
  const [players, setPlayers] = useState<PlayerWithPhoto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data.players);
        setSelectedIds(data.players.map((p: PlayerWithPhoto) => p.id));
      })
      .catch(() => setError("Тоглогчдын мэдээлэл ачаалж чадсангүй."));
  }, []);

  const handleFile = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPhotoFile(file);
    setResult(null);
    setError(null);
    setNotice(null);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const selectMode = (m: Mode) => {
    setMode(m);
    setResult(null);
    setError(null);
    setNotice(null);
    // AI mode works with exactly one player
    if (m === "ai") {
      setSelectedIds((prev) => prev.slice(0, 1));
    }
  };

  const togglePlayer = (id: string) => {
    if (mode === "ai") {
      setSelectedIds([id]);
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds((prev) =>
      prev.length === players.length ? [] : players.map((p) => p.id)
    );
  };

  const openCamera = async () => {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setError("Камерт хандах эрх олгоно уу.");
      setCameraOpen(false);
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "camera.jpg", { type: "image/jpeg" });
      handleFile(file);
      closeCamera();
    }, "image/jpeg", 0.92);
  };

  const showQr = async () => {
    if (!result) return;
    setQrLoading(true);
    setQrDataUrl(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: result }),
      });
      const { url } = await res.json();
      const qr = await QRCode.toDataURL(url, { width: 300, margin: 2 });
      setQrDataUrl(qr);
    } catch {
      setError("QR код үүсгэхэд алдаа гарлаа.");
    } finally {
      setQrLoading(false);
    }
  };

  const generateLocal = async () => {
    if (!photoFile || !photoPreview) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setNotice(null);

    try {
      const selected = players.filter((p) => selectedIds.includes(p.id));

      let dataUrl: string;
      if (mode === "booth") {
        setProgress(
          "Зургийн фоныг хасаж байна… (анхны удаад 1-2 минут болж магадгүй)"
        );
        const { removeBackground } = await import(
          "@imgly/background-removal"
        );
        // Model assets are served from our own /public to avoid CDN fetch issues
        const cutoutBlob = await removeBackground(photoFile, {
          publicPath: `${window.location.origin}/bg-data/`,
        });
        const cutoutUrl = URL.createObjectURL(cutoutBlob);

        setProgress("Постер угсарч байна…");
        const { composeBooth } = await import("@/lib/composeBooth");
        dataUrl = await composeBooth(cutoutUrl, selected);
        URL.revokeObjectURL(cutoutUrl);
      } else {
        setProgress("Коллаж угсарч байна…");
        const { composePolaroid } = await import("@/lib/composePolaroid");
        dataUrl = await composePolaroid(photoPreview, selected);
      }

      const { addLogoHeader } = await import("@/lib/logoHeader");
      setResult(await addLogoHeader(dataUrl));
    } catch (err) {
      console.error(err);
      setError("Зураг угсрахад алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  /**
   * AI mode: try the Gemini route first; if it's unavailable (quota, key…),
   * automatically fall back to a local composite (cutouts + arena background,
   * optionally AI-generated via ImagineArt) so the user always gets a photo.
   */
  const generateAi = async () => {
    const player = players.find((p) => p.id === selectedIds[0]);
    if (!photoFile || !player) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setNotice(null);

    try {
      setProgress("AI зураг үүсгэж байна — 10-30 секунд орчим…");
      const formData = new FormData();
      formData.append("photo", photoFile);
      formData.append("player", player.id);

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.image) {
        const { addLogoHeader } = await import("@/lib/logoHeader");
        setResult(await addLogoHeader(data.image));
        return;
      }
      if (!data.fallback || !player.photoUrl) {
        setError(data.error ?? "Алдаа гарлаа.");
        return;
      }

      // --- Local fallback composite ---
      setProgress(
        "AI горим түр боломжгүй — хамтарсан зургийг локал угсарч байна… (анхны удаад 1-2 минут)"
      );
      const { removeBackground } = await import("@imgly/background-removal");
      const bgConfig = { publicPath: `${window.location.origin}/bg-data/` };

      const [fanBlob, playerBlob, bgBlob] = await Promise.all([
        removeBackground(photoFile, bgConfig),
        removeBackground(
          `${window.location.origin}${player.photoUrl}`,
          bgConfig
        ),
        fetch("/api/background")
          .then((r) => (r.ok ? r.blob() : null))
          .catch(() => null),
      ]);

      const fanUrl = URL.createObjectURL(fanBlob);
      const playerUrl = URL.createObjectURL(playerBlob);
      const bgUrl = bgBlob ? URL.createObjectURL(bgBlob) : null;

      try {
        setProgress("Зураг угсарч байна…");
        const { composeAiPhoto } = await import("@/lib/composeAiPhoto");
        const dataUrl = await composeAiPhoto(fanUrl, playerUrl, bgUrl);
        const { addLogoHeader } = await import("@/lib/logoHeader");
        setResult(await addLogoHeader(dataUrl));
        setNotice(
          `${data.error ?? "AI горим боломжгүй байна."} Тиймээс ${
            bgUrl ? "ImagineArt фонтой" : "локал"
          } хувилбараар угсарлаа.`
        );
      } finally {
        URL.revokeObjectURL(fanUrl);
        URL.revokeObjectURL(playerUrl);
        if (bgUrl) URL.revokeObjectURL(bgUrl);
      }
    } catch (err) {
      console.error(err);
      setError("Зураг үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const generate = () => (mode === "ai" ? generateAi() : generateLocal());

  const canGenerate =
    photoFile &&
    !loading &&
    (mode === "ai" ? selectedIds.length === 1 : selectedIds.length > 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-10">
      {/* Header */}
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">
          The MongolZ
        </p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">
          Багтайгаа зургаа <span className="text-amber-400">татуул</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-400">
          Зургаа оруулаад дуртай тоглогчоо сонго — The MongolZ-ийн
          тоглогчидтой хамтарсан дурсгалын зургаа аваарай.
        </p>
      </header>

      {/* Step 1: Mode */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          <span className="mr-2 text-amber-400">1.</span>Загвараа сонго
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMode(m.id)}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                mode === m.id
                  ? "border-amber-400 bg-amber-400/10"
                  : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{m.label}</span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-400">{m.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: Upload */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          <span className="mr-2 text-amber-400">2.</span>Зургаа оруул
        </h2>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          className={`flex min-h-48 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-colors ${
            dragOver
              ? "border-amber-400 bg-amber-400/10"
              : "border-zinc-700 bg-zinc-900/60 hover:border-zinc-500"
          }`}
        >
          {photoPreview ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Таны зураг"
                className="max-h-64 rounded-xl object-contain"
              />
              <p className="text-sm text-zinc-400">
                Өөр зураг сонгох бол дахин дарна уу
              </p>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-4 text-zinc-400"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-4xl">📷</p>
              <p className="font-medium text-zinc-200">Зургаа оруулна уу</p>
              <div className="flex gap-3">
                <button
                  onClick={openCamera}
                  className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 font-semibold text-zinc-950 hover:bg-amber-300"
                >
                  📸 Камераар авах
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-zinc-600 px-5 py-2.5 font-semibold text-zinc-200 hover:border-zinc-400"
                >
                  🖼 Галереиас сонгох
                </button>
              </div>
              <p className="text-sm">
                {mode === "polaroid"
                  ? "Царай тод харагдсан зураг хамгийн сайн · 8MB хүртэл"
                  : "Бүтэн биеэр эсвэл цээж зураг тохиромжтой · 8MB хүртэл"}
              </p>
            </div>
          )}
        </div>
        {/* Gallery picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
        />
        {/* Webcam capture modal */}
        {cameraOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
              <h3 className="text-lg font-bold">📸 Зураг авах</h3>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-sm rounded-xl"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="flex gap-3">
                <button
                  onClick={capturePhoto}
                  className="rounded-xl bg-amber-400 px-8 py-3 text-lg font-bold text-zinc-950 hover:bg-amber-300"
                >
                  📷 Авах
                </button>
                <button
                  onClick={closeCamera}
                  className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 hover:border-zinc-500"
                >
                  Болих
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Step 3: Players */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            <span className="mr-2 text-amber-400">3.</span>
            {mode === "ai" ? "Нэг тоглогчоо сонго" : "Тоглогчдоо сонго"}
          </h2>
          {mode !== "ai" && (
            <button
              onClick={selectAll}
              className="text-sm text-amber-400 hover:text-amber-300"
            >
              {selectedIds.length === players.length && players.length > 0
                ? "Бүгдийг болих"
                : "Бүх багийг сонгох"}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {players.map((player) => {
            const selected = selectedIds.includes(player.id);
            const disabled = mode === "ai" && !player.photoUrl;
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                disabled={disabled}
                className={`group relative overflow-hidden rounded-2xl border-2 text-left transition-all ${
                  selected
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
                } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
              >
                <div className="aspect-square w-full overflow-hidden bg-zinc-800">
                  {player.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-500">
                      <span className="text-3xl font-bold text-zinc-600">
                        {player.name[0].toUpperCase()}
                      </span>
                      <span className="px-2 text-center text-[10px] leading-tight">
                        Зураг нэмээгүй байна
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="font-semibold">{player.name}</p>
                  <p className="text-xs text-zinc-400">{player.role}</p>
                </div>
                {selected && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-zinc-950">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {mode === "ai" && (
          <p className="mt-2 text-sm text-zinc-500">
            AI горимд нэг тоглогчтой хамт зогсож зургаа татуулсан мэт зураг
            үүснэ.
          </p>
        )}
      </section>

      {/* Generate */}
      <section className="flex flex-col items-center gap-4">
        <button
          onClick={generate}
          disabled={!canGenerate}
          className="w-full max-w-sm rounded-2xl bg-amber-400 px-8 py-4 text-lg font-bold text-zinc-950 transition-all hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Түр хүлээнэ үү…" : "Зураг үүсгэх ✨"}
        </button>
        {!photoFile && (
          <p className="text-sm text-zinc-500">Эхлээд зургаа оруулна уу</p>
        )}
        {photoFile && selectedIds.length === 0 && (
          <p className="text-sm text-zinc-500">
            {mode === "ai"
              ? "Нэг тоглогч сонгоно уу"
              : "Дор хаяж нэг тоглогч сонгоно уу"}
          </p>
        )}
        {error && (
          <p className="max-w-lg rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
            {error}
          </p>
        )}
      </section>

      {/* Progress */}
      {loading && (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-amber-400" />
          <p className="text-center text-zinc-400">{progress}</p>
        </section>
      )}

      {/* Result */}
      {result && (
        <section className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-semibold">Таны зураг бэлэн боллоо 🎉</h2>
          {notice && (
            <p className="max-w-lg rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-200">
              {notice}
            </p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result}
            alt="Үүссэн зураг"
            className="max-h-144 rounded-2xl border border-zinc-800 object-contain"
          />
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={result}
              download={`mongolz-${mode}.png`}
              className="rounded-xl bg-amber-400 px-6 py-3 font-semibold text-zinc-950 hover:bg-amber-300"
            >
              ⬇ Татаж авах
            </a>
            <button
              onClick={showQr}
              disabled={qrLoading}
              className="rounded-xl border border-amber-400/60 px-6 py-3 font-semibold text-amber-300 hover:border-amber-400 disabled:opacity-50"
            >
              {qrLoading ? "Үүсгэж байна…" : "📱 QR кодоор татах"}
            </button>
            <button
              onClick={() => { setResult(null); setQrDataUrl(null); generate(); }}
              className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-200 hover:border-zinc-500"
            >
              Дахин үүсгэх
            </button>
          </div>

          {/* QR code modal */}
          {qrDataUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
              onClick={() => setQrDataUrl(null)}
            >
              <div
                className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold">📱 QR кодоо уншуулна уу</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR code" className="rounded-xl" width={260} height={260} />
                <p className="text-center text-sm text-zinc-400">
                  Утасны камераар уншуулахад зураг татагдана
                  <br />
                  <span className="text-xs text-zinc-500">(30 минутын дотор)</span>
                </p>
                <button
                  onClick={() => setQrDataUrl(null)}
                  className="rounded-xl border border-zinc-700 px-6 py-2 text-sm text-zinc-300 hover:border-zinc-500"
                >
                  Хаах
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="mt-auto pt-10 text-center text-xs text-zinc-600">
        Fan project · The MongolZ-тэй албан ёсны холбоогүй · Оруулсан зургийг
        хадгалдаггүй
      </footer>
    </main>
  );
}
