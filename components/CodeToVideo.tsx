"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Download, Square } from "lucide-react";

type DrawFn = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void;

const RATIOS = [
  { id: "16:9", label: "16:9 · 1280×720", w: 1280, h: 720 },
  { id: "9:16", label: "9:16 · 720×1280", w: 720, h: 1280 },
  { id: "1:1", label: "1:1 · 720×720", w: 720, h: 720 },
  { id: "4:3", label: "4:3 · 960×720", w: 960, h: 720 },
];

const KEY = "nvs:code-to-video";

const SAMPLE = `// Variabel tersedia: ctx (kanvas 2D), t (detik), w dan h (ukuran kanvas)
const g = ctx.createLinearGradient(0, 0, w, h);
g.addColorStop(0, "#0b1030");
g.addColorStop(1, "#3b1a6b");
ctx.fillStyle = g;
ctx.fillRect(0, 0, w, h);
for (let i = 0; i < 6; i++) {
  const a = t * 1.2 + i * 1.05;
  const r = Math.min(w, h) * (0.08 + 0.03 * Math.sin(t * 2 + i));
  ctx.beginPath();
  ctx.arc(w / 2 + Math.cos(a) * w * 0.28, h / 2 + Math.sin(a) * h * 0.22, r, 0, Math.PI * 2);
  ctx.fillStyle = "hsla(" + (190 + i * 25) + ", 90%, 60%, 0.85)";
  ctx.fill();
}
ctx.fillStyle = "#ffffff";
ctx.font = "700 " + w * 0.05 + "px sans-serif";
ctx.textAlign = "center";
ctx.fillText("Neural Video Studio", w / 2, h * 0.9);
`;

const fieldCls =
  "rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-slate-100";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      {children}
    </label>
  );
}

export default function CodeToVideo() {
  const [code, setCode] = useState(SAMPLE);
  const [ready, setReady] = useState(false);
  const [ratioId, setRatioId] = useState("16:9");
  const [fps, setFps] = useState(30);
  const [duration, setDuration] = useState(6);
  const [bg, setBg] = useState("#0b1030");
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fnRef = useRef<DrawFn | null>(null);
  const recStart = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const ratio = RATIOS.find((r) => r.id === ratioId) ?? RATIOS[0];
  const dur = Math.min(60, Math.max(1, duration || 1));

  // Autosave lokal (tanpa backend)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setCode(saved);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(KEY, code);
      } catch {}
    }, 500);
    return () => clearTimeout(id);
  }, [code, ready]);

  // Kompilasi kode pengguna
  useEffect(() => {
    try {
      fnRef.current = new Function("ctx", "t", "w", "h", code) as DrawFn;
      setError(null);
    } catch (e) {
      fnRef.current = null;
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [code]);

  // Loop preview
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h } = ratio;
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const t =
        recStart.current !== null
          ? Math.max(0, (now - recStart.current) / 1000)
          : ((now - t0) / 1000) % dur;
      ctx.save();
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      try {
        fnRef.current?.(ctx, t, w, h);
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        setError((p) => p ?? m);
      }
      ctx.restore();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [ratio, bg, dur]);

  useEffect(() => () => abortRef.current?.(), []);

  const stopRecording = () => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  };

  const record = () => {
    const canvas = canvasRef.current;
    if (!canvas || recording || !fnRef.current) return;
    if (typeof MediaRecorder === "undefined" || typeof canvas.captureStream !== "function") {
      setError("Browser ini belum mendukung perekaman canvas. Gunakan Chrome, Edge, Firefox, atau Safari terbaru.");
      return;
    }
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((m) =>
      MediaRecorder.isTypeSupported(m)
    );
    if (!mime) {
      setError("Browser ini tidak mendukung format video apa pun untuk perekaman.");
      return;
    }

    const rec = new MediaRecorder(canvas.captureStream(fps), {
      mimeType: mime,
      videoBitsPerSecond: 6_000_000,
    });
    const chunks: Blob[] = [];
    let timer = 0;
    let stopper = 0;

    const cleanup = () => {
      window.clearInterval(timer);
      window.clearTimeout(stopper);
      recStart.current = null;
      recorderRef.current = null;
      abortRef.current = null;
    };

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onerror = () => {
      cleanup();
      setRecording(false);
      setProgress(0);
      setError("Perekaman gagal. Coba kurangi resolusi atau durasi.");
    };
    rec.onstop = () => {
      cleanup();
      setRecording(false);
      setProgress(0);
      const blob = new Blob(chunks, { type: mime.split(";")[0] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "neural-video." + (mime.startsWith("video/mp4") ? "mp4" : "webm");
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    recorderRef.current = rec;
    abortRef.current = () => {
      rec.onstop = null;
      rec.onerror = null;
      if (rec.state !== "inactive") rec.stop();
      cleanup();
    };
    recStart.current = performance.now();
    setRecording(true);
    rec.start(250);
    const began = performance.now();
    timer = window.setInterval(
      () => setProgress(Math.min(1, (performance.now() - began) / (dur * 1000))),
      200
    );
    stopper = window.setTimeout(() => {
      if (rec.state !== "inactive") rec.stop();
    }, dur * 1000);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="glass flex flex-col gap-3 p-4">
        <label htmlFor="code" className="text-sm text-slate-300">
          Kode animasi (JavaScript)
        </label>
        <textarea
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="h-72 w-full resize-y rounded-xl bg-black/40 p-3 font-mono text-[13px] leading-relaxed text-cyan-100 lg:h-[28rem]"
        />
        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
            Kesalahan: {error}
          </p>
        )}
      </section>

      <section className="glass flex flex-col gap-3 p-4">
        <div className="flex justify-center overflow-hidden rounded-xl bg-black/50">
          <canvas
            ref={canvasRef}
            width={ratio.w}
            height={ratio.h}
            className="h-auto max-h-[60vh] max-w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Rasio dan resolusi">
            <select className={fieldCls} value={ratioId} disabled={recording} onChange={(e) => setRatioId(e.target.value)}>
              {RATIOS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </Field>
          <Field label="FPS">
            <select className={fieldCls} value={fps} disabled={recording} onChange={(e) => setFps(Number(e.target.value))}>
              {[24, 30, 60].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Durasi (1–60 detik)">
            <input
              type="number"
              min={1}
              max={60}
              className={fieldCls}
              value={duration}
              disabled={recording}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </Field>
          <Field label="Warna latar">
            <input
              type="color"
              className={fieldCls + " h-10 w-full"}
              value={bg}
              disabled={recording}
              onChange={(e) => setBg(e.target.value)}
            />
          </Field>
        </div>

        <button className="btn" onClick={recording ? stopRecording : record} disabled={!recording && !!error && !fnRef.current}>
          {recording ? (
            <>
              <Square size={16} /> Hentikan dan simpan
            </>
          ) : (
            <>
              <Download size={16} /> Rekam dan unduh video
            </>
          )}
        </button>
        {recording && (
          <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
            <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: progress * 100 + "%" }} />
          </div>
        )}
        <p className="text-xs text-slate-400">
          Perekaman berjalan real-time sesuai durasi. Biarkan tab tetap terbuka sampai file terunduh.
          Format mengikuti dukungan browser (WebM, atau MP4 di Safari).
        </p>
      </section>
    </div>
  );
}
