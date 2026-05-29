"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data: { ok?: boolean; error?: string } = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "登录失败，请重试。");
        return;
      }
      router.replace("/");
    } catch {
      setError("网络出错了，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">英语口语训练</h1>
        <p className="text-sm text-slate-500">输入密码开始练习</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="密码"
          autoFocus
          className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-base font-medium text-white active:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "登录中……" : "登录"}
        </button>
        {error ? <p className="text-center text-sm text-rose-600">{error}</p> : null}
      </form>
    </main>
  );
}
