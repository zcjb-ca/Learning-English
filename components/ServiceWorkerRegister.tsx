"use client";

import { useEffect } from "react";

// Registers the minimal service worker in production so the app is installable
// (Add to Home Screen). No-op in development to avoid stale-cache surprises.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registration failures are non-fatal
    });
  }, []);
  return null;
}
