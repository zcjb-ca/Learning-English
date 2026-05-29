"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/logout", { method: "POST" });
      router.replace("/login");
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="text-sm text-slate-400 underline-offset-2 hover:underline disabled:opacity-50"
    >
      退出登录
    </button>
  );
}
