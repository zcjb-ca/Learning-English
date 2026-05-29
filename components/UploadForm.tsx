"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface UploadResult {
  id: string;
  title: string;
  frames: number;
}

// Uploads a PDF to /api/lessons, which extracts text and asks Claude to build
// the lesson (passages + transferable frames). This is how the learner keeps
// adding new material over time — no code changes needed.
export function UploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<UploadResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("请选择一个 PDF 文件。");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (title.trim()) form.append("title", title.trim());
      const res = await fetch("/api/lessons", { method: "POST", body: form });
      const data: Partial<UploadResult> & { error?: string } = await res.json();
      if (!res.ok || !data.id) {
        setError(data.error ?? "上传失败，请重试。");
        return;
      }
      setDone({ id: data.id, title: data.title ?? "新课", frames: data.frames ?? 0 });
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setError("网络出错了，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="pdf">
          上传一个 PDF，生成新课程
        </label>
        <input
          id="pdf"
          ref={fileRef}
          type="file"
          accept="application/pdf"
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
        {busy ? "正在解析并抽取句式（约 10–30 秒）……" : "上传并生成"}
      </button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {done ? (
        <p className="text-sm text-emerald-700">
          已生成《{done.title}》，抽出 {done.frames} 个句式。
        </p>
      ) : null}
    </form>
  );
}
