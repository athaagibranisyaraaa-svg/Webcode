"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Film, Home, Mic } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const Loading = () => <p className="p-6 text-sm text-slate-400">Memuat alat…</p>;
const CodeToVideo = dynamic(() => import("@/components/CodeToVideo"), { ssr: false, loading: Loading });
const TextToSpeech = dynamic(() => import("@/components/TextToSpeech"), { ssr: false, loading: Loading });

type Tab = "home" | "code" | "tts";

const NAV: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: "home", label: "Beranda", Icon: Home },
  { id: "code", label: "Code to Video", Icon: Film },
  { id: "tts", label: "Text to Speech", Icon: Mic },
];

export default function Page() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      <aside className="glass sticky top-4 m-4 hidden h-fit w-56 shrink-0 flex-col gap-1 p-3 md:flex">
        <p className="px-3 py-2 text-lg font-bold tracking-tight">Neural Video Studio</p>
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
              tab === id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </aside>

      <motion.main
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="min-w-0 flex-1 p-4 pb-24 md:pb-6"
      >
        {tab === "home" && (
          <div className="glass flex flex-col gap-4 p-6 md:p-10">
            <h1 className="max-w-xl text-3xl font-bold leading-tight md:text-4xl">
              Ubah kode jadi video, langsung di browser.
            </h1>
            <p className="max-w-prose text-slate-300">
              Tulis animasi dengan JavaScript Canvas, lihat hasilnya langsung, lalu rekam menjadi file video.
              Tanpa akun dan tanpa API berbayar.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="btn" onClick={() => setTab("code")}>Buka Code to Video</button>
              <button className="btn btn-ghost" onClick={() => setTab("tts")}>Buka Text to Speech</button>
            </div>
          </div>
        )}
        {tab === "code" && <CodeToVideo />}
        {tab === "tts" && <TextToSpeech />}
      </motion.main>

      <nav className="glass fixed inset-x-3 bottom-3 z-10 flex justify-around p-2 md:hidden" aria-label="Navigasi utama">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-xs ${
              tab === id ? "bg-white/10 text-white" : "text-slate-400"
            }`}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
