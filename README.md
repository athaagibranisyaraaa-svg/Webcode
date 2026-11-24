# Neural Video Studio

Studio kreatif berbasis browser: ubah kode JavaScript Canvas menjadi video, dan teks menjadi suara. Tanpa login, tanpa API berbayar.

## Menjalankan
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build produksi
```

## Deploy ke Vercel lewat GitHub
1. Buat repo GitHub, lalu `git init && git add . && git commit -m "init" && git push`.
2. Di vercel.com pilih Add New → Project → import repo tersebut.
3. Framework Next.js terdeteksi otomatis. Tekan Deploy (tidak perlu vercel.json atau environment variable).

## Fitur saat ini
- Code to Video: editor kode, live preview, rasio/resolusi, FPS, durasi, warna latar, rekam ke WebM/MP4 (MediaRecorder), autosave lokal.
- Text to Speech: suara asli dari `speechSynthesis.getVoices()` (diperbarui lewat `voiceschanged`), filter bahasa, kecepatan, pitch, volume, putar/jeda/lanjut/berhenti.

## Belum dibuat
Text to Video, Video Editor, AI Voice Studio, My Projects (IndexedDB), Settings, Monaco/CodeMirror, FFmpeg.wasm, ekspor audio TTS.
