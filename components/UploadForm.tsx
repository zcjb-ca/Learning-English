"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

interface UploadResult {
  id: string;
  title: string;
  frames: number;
  collocations: number;
}

// Map a file extension to a safe `audio/*` MIME type. The browser's File.type is
// unreliable for .m4a (often "" or even "video/mp4"), and the upload token only
// accepts `audio/*` — so we derive the content type from the extension instead.
const AUDIO_MIME: Record<string, string> = {
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  webm: "audio/webm",
};

function audioExt(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  return /^[a-z0-9]+$/.test(ext) ? ext : "m4a";
}

// Creates a lesson from a subtitle (.lrc) + audio file. The audio uploads
// DIRECTLY from the browser to Vercel Blob (bypassing the ~4.5MB function body
// limit); we then POST the small subtitle text + the resulting Blob URL to
// /api/lessons, which asks Claude to add translations, collocations, and frames.
export function UploadForm() {
  const router = useRouter();
  const lrcRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<UploadResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lrcFile = lrcRef.current?.files?.[0];
    const audioFile = audioRef.current?.files?.[0];
    if (!lrcFile) {
      setError("请选择字幕文件（.lrc 或 .txt）。");
      return;
    }
    if (!audioFile) {
      setError("请选择音频文件（.m4a / .mp3）。");
      return;
    }

    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const lrcText = await lrcFile.text();

      setPhase("上传音频中");
      const ext = audioExt(audioFile.name);

      const controller = new AbortController();
      const uploadTimeout = setTimeout(() => controller.abort(), 3 * 60 * 1000);

      let blob: Awaited<ReturnType<typeof upload>>;
      try {
        blob = await upload(`lessons/${crypto.randomUUID()}.${ext}`, audioFile, {
          access: "public",
          handleUploadUrl: "/api/lessons/upload-audio",
          contentType: AUDIO_MIME[ext] ?? "audio/mpeg",
          abortSignal: controller.signal,
        });
      } finally {
        clearTimeout(uploadTimeout);
      }

      setPhase("抽取句式与固定搭配中");
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          sourceFilename: lrcFile.name,
          lrcText,
          audioUrl: blob.url,
        }),
      });
      if (!res.ok) {
        let msg = "生成失败，请重试。";
        try {
          const body = await res.json();
          if (body.error) msg = body.error;
        } catch {}
        setError(msg);
        return;
      }
      const data: Partial<UploadResult> & { error?: string } = await res.json();
      if (!data.id) {
        setError(data.error ?? "生成失败，请重试。");
        return;
      }
      setDone({
        id: data.id,
        title: data.title ?? "新课",
        frames: data.frames ?? 0,
        collocations: data.collocations ?? 0,
      });
      setTitle("");
      if (lrcRef.current) lrcRef.current.value = "";
      if (audioRef.current) audioRef.current.value = "";
      router.refresh();
    } catch (err) {
      console.error("[upload] 直传失败:", err);
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("音频上传超时，请检查网络后重试。");
      } else {
        const detail = err instanceof Error ? err.message : "";
        setError(detail ? `出错了：${detail}` : "出错了，请重试。");
      }
    } finally {
      setBusy(false);
      setPhase(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-700">上传字幕 + 音频，生成新课程</p>

      <div className="space-y-1">
        <label className="text-xs text-slate-500" htmlFor="lrc">
          字幕文件（.lrc / .txt，需带 [mm:ss.xx] 时间戳）
        </label>
        <input
          id="lrc"
          ref={lrcRef}
          type="file"
          accept=".lrc,.txt,text/plain"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-500" htmlFor="audio">
          音频文件（.m4a / .mp3）
        </label>
        <input
          id="audio"
          ref={audioRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.aac"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
        />
      </div>

      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="课程标题（可留空，自动用文件名）"
        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white active:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? `${phase ?? "处理中"}……` : "上传并生成"}
      </button>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {done ? (
        <p className="text-sm text-emerald-700">
          已生成《{done.title}》，抽出 {done.frames} 个句式、{done.collocations} 个固定搭配。
        </p>
      ) : null}
    </form>
  );
}
