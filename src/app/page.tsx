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

type Mode = "booth" | "polaroid" | "ai";

const MODES: { id: Mode; label: string; icon: string; description: string }[] = [
  {
    id: "booth",
    label: "Photo Booth",
    icon: "📸",
    description: "HLTV banner — багийн мөр + шинэ гишүүн",
  },
  {
    id: "polaroid",
    label: "Polaroid",
    icon: "🖼",
    description: "Fan wall — polaroid зургуудын хана",
  },
  {
    id: "ai",
    label: "AI зураг",
    icon: "✨",
    description: "Нэг тоглогчтой хамт зогсож зургаа татуулсан мэт зураг",
  },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("booth");
  const [players, setPlayers] = useState<PlayerWithPhoto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
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
      const selected = playersForCompose(
        players.filter((p) => selectedIds.includes(p.id))
      );

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
        dataUrl = await composeBooth(cutoutUrl, selected, userName);
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
      if (!data.fallback || !(player.composePhotoUrl ?? player.photoUrl)) {
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
    <>
      {/* Header — mode selector */}
      <header className="sticky top-0 z-40">
        <div className="h-1 bg-gradient-to-r from-pc-green-dark via-pc-teal to-pc-purple" />
        <div className="border-b border-pc-border/70 bg-white/90 shadow-[0_4px_24px_rgba(45,138,78,0.07)] backdrop-blur-lg">
          <div className="mx-auto max-w-5xl px-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pc-mint to-pc-green/20 p-2 ring-1 ring-pc-green/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/players/pineconeLogo.png"
                    alt="Pinecone Academy"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pc-purple">
                    Pinecone Academy
                  </p>
                  <p className="text-lg font-bold leading-tight text-pc-green-dark">
                    × The MongolZ
                  </p>
                </div>
              </div>

              {/* Mode tabs */}
              <div className="flex flex-col gap-2 lg:min-w-[420px]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pc-text-muted lg:text-right">
                  Загвараа сонго
                </p>
                <div className="flex gap-1 rounded-2xl bg-pc-mint p-1.5 ring-1 ring-pc-border/60">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => selectMode(m.id)}
                      className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 transition-all duration-200 sm:flex-row sm:justify-center sm:gap-2 sm:px-3 ${
                        mode === m.id
                          ? "bg-white text-pc-green-dark shadow-md ring-1 ring-pc-green/25"
                          : "text-pc-text-muted hover:bg-white/50 hover:text-pc-green-dark"
                      }`}
                    >
                      <span className="text-base leading-none">{m.icon}</span>
                      <span className="text-[11px] font-bold sm:text-sm">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active mode description */}
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-pc-border/60 bg-gradient-to-r from-pc-green/8 via-pc-teal/8 to-pc-purple/8 px-4 py-2.5">
              <span className="mt-0.5 text-sm leading-none">
                {MODES.find((m) => m.id === mode)?.icon}
              </span>
              <p className="text-sm leading-snug text-pc-green-dark">
                {MODES.find((m) => m.id === mode)?.description}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-8">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-3xl font-bold text-pc-green-dark sm:text-4xl">
          Багтайгаа зургаа <span className="text-pc-teal">татуул</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-pc-text-muted">
          Зургаа оруулаад дуртай тоглогчоо сонго — The MongolZ-ийн
          тоглогчидтой хамтарсан дурсгалын зургаа аваарай.
        </p>
      </section>

      {/* Step 1: Upload */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          <span className="mr-2 text-pc-green">1.</span>Зургаа оруул
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
              ? "border-pc-green bg-pc-green/10"
              : "border-pc-border bg-pc-surface/80 hover:border-pc-green/40"
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
              <p className="text-sm text-pc-text-muted">
                Өөр зураг сонгох бол дахин дарна уу
              </p>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-4 text-pc-text-muted"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-4xl">📷</p>
              <p className="font-medium text-pc-green-dark">Зургаа оруулна уу</p>
              <div className="flex gap-3">
                <button
                  onClick={openCamera}
                  className="flex items-center gap-2 rounded-xl bg-pc-green px-5 py-2.5 font-semibold text-white hover:bg-pc-green-dark"
                >
                  📸 Камераар авах
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-pc-border px-5 py-2.5 font-semibold text-pc-green-dark hover:border-pc-green"
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
        {mode === "booth" && (
          <div className="mt-3">
            <label
              htmlFor="user-name"
              className="mb-1.5 block text-sm font-medium text-pc-green-dark"
            >
              Nickname
            </label>
            <input
              id="user-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="YOU"
              maxLength={20}
              className="w-full rounded-xl border border-pc-border bg-white px-4 py-2.5 text-pc-green-dark placeholder:text-pc-text-muted/60 focus:border-pc-green focus:outline-none focus:ring-2 focus:ring-pc-green/20"
            />
            <p className="mt-1 text-xs text-pc-text-muted">
              Хоосон бол &quot;YOU&quot; гэж харагдана
            </p>
          </div>
        )}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-pc-green-dark/40 p-4 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-pc-border bg-pc-surface p-6 shadow-lg">
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
                  className="rounded-xl bg-pc-green px-8 py-3 text-lg font-bold text-white hover:bg-pc-green-dark"
                >
                  📷 Авах
                </button>
                <button
                  onClick={closeCamera}
                  className="rounded-xl border border-pc-border px-6 py-3 font-semibold text-pc-text-muted hover:border-pc-green"
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
            <span className="mr-2 text-pc-green">2.</span>
            {mode === "ai" ? "Нэг тоглогчоо сонго" : "Тоглогчдоо сонго"}
          </h2>
          {mode !== "ai" && (
            <button
              onClick={selectAll}
              className="text-sm text-pc-green hover:text-pc-green-dark"
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
            const disabled = mode === "ai" && !(player.composePhotoUrl ?? player.photoUrl);
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                disabled={disabled}
                className={`group relative overflow-hidden rounded-2xl border-2 text-left transition-all ${
                  selected
                    ? "border-pc-green bg-pc-green/10 shadow-sm"
                    : "border-pc-border bg-pc-surface/80 hover:border-pc-green/40"
                } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
              >
                <div className="aspect-square w-full overflow-hidden bg-pc-mint">
                  {player.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-pc-text-muted">
                      <span className="text-3xl font-bold text-pc-green/40">
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
                  <p className="text-xs text-pc-text-muted">{player.role}</p>
                </div>
                {selected && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-pc-green text-sm font-bold text-white">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {mode === "ai" && (
          <p className="mt-2 text-sm text-pc-text-muted">
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
          className="w-full max-w-sm rounded-2xl bg-pc-green px-8 py-4 text-lg font-bold text-white transition-all hover:bg-pc-green-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Түр хүлээнэ үү…" : "Зураг үүсгэх ✨"}
        </button>
        {!photoFile && (
          <p className="text-sm text-pc-text-muted">Эхлээд зургаа оруулна уу</p>
        )}
        {photoFile && selectedIds.length === 0 && (
          <p className="text-sm text-pc-text-muted">
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
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-pc-border bg-pc-surface/80 p-10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-pc-mint border-t-pc-green" />
          <p className="text-center text-pc-text-muted">{progress}</p>
        </section>
      )}

      {/* Result */}
      {result && (
        <section className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-semibold">Таны зураг бэлэн боллоо 🎉</h2>
          {notice && (
            <p className="max-w-lg rounded-xl border border-pc-teal/40 bg-pc-teal/10 px-4 py-3 text-center text-sm text-pc-green-dark">
              {notice}
            </p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result}
            alt="Үүссэн зураг"
            className="max-h-144 rounded-2xl border border-pc-border object-contain shadow-md"
          />
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={result}
              download={`mongolz-${mode}.png`}
              className="rounded-xl bg-pc-green px-6 py-3 font-semibold text-white hover:bg-pc-green-dark"
            >
              ⬇ Татаж авах
            </a>
            <button
              onClick={showQr}
              disabled={qrLoading}
              className="rounded-xl border border-pc-purple/50 px-6 py-3 font-semibold text-pc-purple hover:border-pc-purple disabled:opacity-50"
            >
              {qrLoading ? "Үүсгэж байна…" : "📱 QR кодоор татах"}
            </button>
            <button
              onClick={() => { setResult(null); setQrDataUrl(null); generate(); }}
              className="rounded-xl border border-pc-border px-6 py-3 font-semibold text-pc-text-muted hover:border-pc-green"
            >
              Дахин үүсгэх
            </button>
          </div>

          {/* QR code modal */}
          {qrDataUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-pc-green-dark/40 p-4 backdrop-blur-sm"
              onClick={() => setQrDataUrl(null)}
            >
              <div
                className="flex flex-col items-center gap-4 rounded-2xl border border-pc-border bg-pc-surface p-8 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold">📱 QR кодоо уншуулна уу</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR code" className="rounded-xl" width={260} height={260} />
                <p className="text-center text-sm text-pc-text-muted">
                  Утасны камераар уншуулахад зураг татагдана
                  <br />
                  <span className="text-xs text-pc-text-muted/70">(30 минутын дотор)</span>
                </p>
                <button
                  onClick={() => setQrDataUrl(null)}
                  className="rounded-xl border border-pc-border px-6 py-2 text-sm text-pc-text-muted hover:border-pc-green"
                >
                  Хаах
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="mt-auto pt-10 text-center text-xs text-pc-text-muted">
        Pinecone Academy · Fan project · The MongolZ-тэй албан ёсны холбоогүй · Оруулсан зургийг
        хадгалдаггүй
      </footer>
    </main>
    </>
  );
}
