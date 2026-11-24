"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";

type Status = "idle" | "speaking" | "paused";

function splitText(s: string): string[] {
  const parts = s.match(/[^.!?。！？\n]+[.!?。！？]*\s*/g) ?? [s];
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + p).length > 200 && cur) {
      out.push(cur.trim());
      cur = p;
    } else cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function langName(code: string): string {
  try {
    return new Intl.DisplayNames(["id"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const fieldCls = "rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-slate-100";

export default function TextToSpeech() {
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [lang, setLang] = useState("all");
  const [text, setText] = useState("Halo! Ini adalah uji suara dari Neural Video Studio.");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const runId = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const synth = window.speechSynthesis;
    const load = () => {
      const v = synth.getVoices();
      setVoices(v);
      setVoiceURI((cur) => cur || (v.find((x) => x.default)?.voiceURI ?? v[0]?.voiceURI ?? ""));
    };
    load();
    synth.addEventListener("voiceschanged", load);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      synth.cancel();
    };
  }, []);

  const langs = useMemo(
    () => Array.from(new Set(voices.map((v) => v.lang.split(/[-_]/)[0]))).sort(),
    [voices]
  );
  const shown = useMemo(
    () => (lang === "all" ? voices : voices.filter((v) => v.lang.split(/[-_]/)[0] === lang)),
    [voices, lang]
  );

  const speak = () => {
    const synth = window.speechSynthesis;
    const parts = splitText(text);
    if (!parts.length) return;
    synth.cancel();
    const id = ++runId.current;
    const voice = voices.find((v) => v.voiceURI === voiceURI);
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.rate = rate;
      u.pitch = pitch;
      u.volume = volume;
      if (i === parts.length - 1) u.onend = () => id === runId.current && setStatus("idle");
      u.onerror = (e) => {
        if (id === runId.current && e.error !== "interrupted" && e.error !== "canceled") setStatus("idle");
      };
      synth.speak(u);
    });
    setStatus("speaking");
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setStatus("paused");
  };
  const resume = () => {
    window.speechSynthesis.resume();
    setStatus("speaking");
  };
  const stop = () => {
    runId.current++;
    window.speechSynthesis.cancel();
    setStatus("idle");
  };

  if (!supported) {
    return (
      <div className="glass p-6 text-sm text-slate-300">
        Browser ini tidak mendukung Web Speech API (SpeechSynthesis). Coba Chrome, Edge, atau Safari terbaru.
      </div>
    );
  }

  return (
    <div className="glass flex flex-col gap-4 p-4 md:p-6">
      <label htmlFor="tts-text" className="text-sm text-slate-300">Teks</label>
      <textarea
        id="tts-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-40 w-full resize-y rounded-xl bg-black/40 p-3 text-sm"
      />
      <p className="text-xs text-slate-400">{text.length} karakter</p>

      {voices.length === 0 ? (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
          Browser belum menyediakan suara. Daftar akan terisi otomatis jika suara tersedia; periksa pengaturan
          suara/bahasa di perangkat Anda.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Bahasa
            <select className={fieldCls} value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="all">Semua bahasa ({voices.length} suara)</option>
              {langs.map((l) => (
                <option key={l} value={l}>{langName(l)} ({l})</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Suara
            <select className={fieldCls} value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)}>
              {shown.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Kecepatan", v: rate, set: setRate, min: 0.5, max: 2, step: 0.1 },
          { label: "Pitch", v: pitch, set: setPitch, min: 0, max: 2, step: 0.1 },
          { label: "Volume", v: volume, set: setVolume, min: 0, max: 1, step: 0.05 },
        ].map((c) => (
          <label key={c.label} className="flex flex-col gap-1 text-xs text-slate-400">
            {c.label}: {c.v.toFixed(2)}
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={c.v}
              onChange={(e) => c.set(Number(e.target.value))}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn" onClick={speak} disabled={!text.trim()}>
          <Play size={16} /> Putar
        </button>
        <button className="btn btn-ghost" onClick={pause} disabled={status !== "speaking"}>
          <Pause size={16} /> Jeda
        </button>
        <button className="btn btn-ghost" onClick={resume} disabled={status !== "paused"}>
          <Play size={16} /> Lanjut
        </button>
        <button className="btn btn-ghost" onClick={stop} disabled={status === "idle"}>
          <Square size={16} /> Berhenti
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Unduh audio belum tersedia: SpeechSynthesis memutar suara langsung ke perangkat dan browser tidak
        memberi akses untuk merekamnya sebagai file.
      </p>
    </div>
  );
}
