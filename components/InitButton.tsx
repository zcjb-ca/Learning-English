"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Shown on the home page only when the database tables aren't there yet. Calls
// the idempotent /api/init once to create them, then refreshes.
export function InitButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function init() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/init");
      const data: { error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error ?? "初始化失败，请稍后重试。");
        return;
      }
      router.refresh();
    } catch {
      setError("网络出错了，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={init}
        disabled={busy}
        className="inline-flex items-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white active:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? "正在初始化……" : "初始化数据库"}
      </button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
