"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type PlayerWithPhoto = {
  id: string;
  name: string;
  role: string;
  photoUrl: string | null;
  composePhotoUrl: string | null;
};

function playersForCompose(list: PlayerWithPhoto[]) {
  return list.map((p) => ({
    name: p.name,
    photoUrl: p.composePhotoUrl ?? p.photoUrl,
  }));
}

type Mode = "polaroid" | "ai";

const MODES: { id: Mode; label: string; icon: string; description: string }[] = [
  {
    id: "polaroid",
    label: "Polaroid",
    icon: "🖼",
    description: "Polaroid-style fan wall collage",
  },
  {
    id: "ai",
    label: "AI Photo",
    icon: "✨",
    description: "Photo that looks like you posed with a player",
  },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("polaroid");
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
  const loadingVideoRef = useRef<HTMLVideoElement>(null);
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

  useEffect(() => {
    const video = loadingVideoRef.current;
    if (!loading || mode !== "ai" || !video) return;

    video.muted = false;
    video.volume = 1;
    void video.play();

    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [loading, mode]);

  useEffect(() => {
    if (!(loading && mode === "ai")) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [loading, mode]);

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
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Share failed");
      }
      const qr = await QRCode.toDataURL(data.url, { width: 300, margin: 2 });
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
      const selected = playersForCompose(
        players.filter((p) => selectedIds.includes(p.id))
      );

      setProgress("Building collage…");
      const { composePolaroid } = await import("@/lib/composePolaroid");
      const dataUrl = await composePolaroid(photoPreview, selected);

      const { addLogoHeader } = await import("@/lib/logoHeader");
      setResult(await addLogoHeader(dataUrl));
    } catch (err) {
      console.error(err);
      setError("Failed to build image. Try again.");
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
      setProgress("Generating AI photo — about 10–30 seconds…");
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
      if (!data.fallback || !(player.composePhotoUrl ?? player.photoUrl)) {
        setError(data.error ?? "Алдаа гарлаа.");
        return;
      }

      // --- Local fallback composite ---
      setProgress(
        "AI unavailable — building fallback image… (1–2 min first time)"
      );
      const { removeBackground } = await import("@imgly/background-removal");
      const bgConfig = { publicPath: `${window.location.origin}/bg-data/` };

      const [fanBlob, playerBlob, bgBlob] = await Promise.all([
        removeBackground(photoFile, bgConfig),
        removeBackground(
          `${window.location.origin}${player.composePhotoUrl ?? player.photoUrl}`,
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
        setProgress("Compositing image…");
        const { composeAiPhoto } = await import("@/lib/composeAiPhoto");
        const dataUrl = await composeAiPhoto(fanUrl, playerUrl, bgUrl);
        const { addLogoHeader } = await import("@/lib/logoHeader");
        setResult(await addLogoHeader(dataUrl));
        setNotice(
          `${data.error ?? "AI unavailable."} Used the ${
            bgUrl ? "ImagineArt background" : "basic"
          } version instead.`
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
    <>
      {/* Header — mode selector */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 items-center justify-center rounded-lg bg-white px-2.5 py-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/players/logo.png"
                  alt="The MongolZ"
                  className="h-8 object-contain sm:h-9"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                  The MongolZ
                </p>
                <p className="text-sm font-bold text-zinc-100">Fan Photo Generator</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:min-w-[320px]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 lg:text-right">
                Choose a style
              </p>
              <div className="flex gap-1 rounded-xl bg-zinc-900 p-1 ring-1 ring-zinc-800">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => selectMode(m.id)}
                    className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 transition-all duration-200 sm:flex-row sm:justify-center sm:gap-2 sm:px-3 ${
                      mode === m.id
                        ? "bg-zinc-800 text-amber-400 shadow-sm ring-1 ring-amber-400/30"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-base leading-none">{m.icon}</span>
                    <span className="text-[11px] font-bold sm:text-sm">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-2.5">
            <span className="mt-0.5 text-sm leading-none">
              {MODES.find((m) => m.id === mode)?.icon}
            </span>
            <p className="text-sm leading-snug text-zinc-400">
              {MODES.find((m) => m.id === mode)?.description}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-8">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-3xl font-bold text-zinc-100 sm:text-4xl">
          Take a photo <span className="text-amber-400">with the team</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-400">
          Upload your photo and pick your favorite players — create a memory
          shot with The MongolZ.
        </p>
      </section>

      {/* Step 1: Upload */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          <span className="mr-2 text-amber-400">1.</span>Зураг оруулах
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
              : "border-zinc-700 bg-zinc-900/60 hover:border-amber-400/40"
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
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-zinc-950 hover:bg-amber-400"
                >
                  📸 Камераар авах
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 hover:border-amber-400"
                >
                  🖼 From Gallery
                </button>
              </div>
              <p className="text-sm">
                Use a clear photo of your face · up to 8MB
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
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
                  className="rounded-xl bg-amber-500 px-8 py-3 text-lg font-bold text-zinc-950 hover:bg-amber-400"
                >
                  📷 Авах
                </button>
                <button
                  onClick={closeCamera}
                  className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-400 hover:border-amber-400"
                >
                  Болих
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Step 2: Players */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            <span className="mr-2 text-amber-400">2.</span>
            {mode === "ai" ? "Нэг тоглогчоо сонго" : "Тоглогчдоо сонго"}
          </h2>
          {mode !== "ai" && (
            <button
              onClick={selectAll}
              className="text-sm text-amber-400 hover:text-amber-300"
            >
              {selectedIds.length === players.length && players.length > 0
                ? "Бүгдийг хасах"
                : "Бүх тоглогчийг сонгох"}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {players.map((player) => {
            const selected = selectedIds.includes(player.id);
            const disabled = mode === "ai" && !(player.composePhotoUrl ?? player.photoUrl);
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                disabled={disabled}
                className={`group relative overflow-hidden rounded-2xl border-2 text-left transition-all ${
                  selected
                    ? "border-amber-400 bg-amber-400/10 shadow-sm"
                    : "border-zinc-800 bg-zinc-900/80 hover:border-amber-400/40"
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
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-400">
                      <span className="text-3xl font-bold text-amber-400/40">
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
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-zinc-950">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {mode === "ai" && (
          <p className="mt-2 text-sm text-zinc-400">
            Creates a photo that looks like you posed together with one player.
          </p>
        )}
      </section>

      {/* Generate */}
      <section className="flex flex-col items-center gap-4">
        <button
          onClick={generate}
          disabled={!canGenerate}
          className="w-full max-w-sm rounded-2xl bg-amber-500 px-8 py-4 text-lg font-bold text-zinc-950 transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Түр хүлээнэ үү…" : "Зураг үүсгэх ✨"}
        </button>
        {!photoFile && (
          <p className="text-sm text-zinc-400">Эхлээд зургаа оруулна уу</p>
        )}
        {photoFile && selectedIds.length === 0 && (
          <p className="text-sm text-zinc-400">
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

      {/* Progress — polaroid spinner */}
      {loading && mode !== "ai" && (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-amber-400" />
          <p className="text-center text-zinc-400">{progress}</p>
        </section>
      )}

      {/* Result */}
      {result && (
        <section className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-semibold">Таны зураг бэлэн боллоо 🎉</h2>
          {notice && (
            <p className="max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
              {notice}
            </p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result}
            alt="Үүссэн зураг"
            className="max-h-144 rounded-2xl border border-zinc-800 object-contain shadow-md"
          />
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={result}
              download={`mongolz-${mode}.png`}
              className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-zinc-950 hover:bg-amber-400"
            >
              ⬇ Татаж авах
            </a>
            <button
              onClick={showQr}
              disabled={qrLoading}
              className="rounded-xl border border-zinc-600 px-6 py-3 font-semibold text-zinc-300 hover:border-amber-400 disabled:opacity-50"
            >
              {qrLoading ? "Үүсгэж байна…" : "📱 QR кодоор татах"}
            </button>
            <button
              onClick={() => { setResult(null); setQrDataUrl(null); generate(); }}
              className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-400 hover:border-amber-400"
            >
              Дахин үүсгэх
            </button>
          </div>

          {/* QR code modal */}
          {qrDataUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={() => setQrDataUrl(null)}
            >
              <div
                className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold">📱 QR кодоо уншуулна уу</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR code" className="rounded-xl" width={260} height={260} />
                <p className="text-center text-sm text-zinc-400">
                  Scan with your phone camera to open the share page for
                  Instagram and Facebook
                  <br />
                  <span className="text-xs text-zinc-400/70">(valid for 30 minutes)</span>
                </p>
                <button
                  onClick={() => setQrDataUrl(null)}
                  className="rounded-xl border border-zinc-700 px-6 py-2 text-sm text-zinc-400 hover:border-amber-400"
                >
                  Хаах
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="mt-auto pt-10 text-center text-xs text-zinc-500">
        Fan project · Not affiliated with The MongolZ · Uploaded photos are not stored
      </footer>
    </main>

      {/* Progress — AI fullscreen video */}
      {loading && mode === "ai" && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black px-4 py-8">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={loadingVideoRef}
            src="/loading.mov"
            loop
            playsInline
            className="max-h-[88vh] max-w-[92vw] object-contain"
          />
          {progress && (
            <p className="absolute inset-x-0 bottom-8 px-6 text-center text-sm font-medium text-white/90 drop-shadow-lg">
              {progress}
            </p>
          )}
        </div>
      )}
    </>
  );
}
