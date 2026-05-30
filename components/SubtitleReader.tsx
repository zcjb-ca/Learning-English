"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Highlighter from "react-highlight-words";
import type { Passage } from "@/lib/types";
import { type ClipPlayer } from "./useClipPlayer";

interface SubtitleReaderProps {
  passages: Passage[];
  player: ClipPlayer;
  onInterested?: (phrase: string, context: string) => void;
}

export function SubtitleReader({
  passages,
  player,
  onInterested,
}: SubtitleReaderProps) {
  const shown = passages.length > 0 ? passages : [];

  return (
    <div className="space-y-4">
      {player.supported ? <SpeedToggle player={player} /> : null}

      <div className="space-y-3">
        {shown.map((p, i) => (
          <PassageCard key={i} passage={p} player={player} onInterested={onInterested} />
        ))}
      </div>
    </div>
  );
}

function PassageCard({
  passage,
  player,
  onInterested,
}: {
  passage: Passage;
  player: ClipPlayer;
  onInterested?: (phrase: string, context: string) => void;
}) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [popup, setPopup] = useState<{ text: string; top: number; left: number } | null>(null);

  const handlePointerUp = useCallback(() => {
    if (!onInterested) return;
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (text.length < 2 || !textRef.current) {
      setPopup(null);
      return;
    }
    const range = sel!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setPopup({ text, top: rect.bottom + 4, left: rect.left });
  }, [onInterested]);

  useEffect(() => {
    function dismiss(e: MouseEvent) {
      if (popup && textRef.current && !textRef.current.contains(e.target as Node)) {
        setPopup(null);
      }
    }
    document.addEventListener("mousedown", dismiss);
    return () => document.removeEventListener("mousedown", dismiss);
  }, [popup]);

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p
          ref={textRef}
          onPointerUp={handlePointerUp}
          className="text-base leading-relaxed text-slate-800 select-text"
        >
          <Highlighter
            searchWords={passage.collocations ?? []}
            textToHighlight={passage.text}
            highlightTag="strong"
            highlightClassName="font-semibold text-slate-900"
            autoEscape
          />
        </p>
        <PlayButton player={player} start={passage.start} end={passage.end} />
      </div>
      {passage.translation_zh ? (
        <p className="text-sm leading-relaxed text-slate-400">{passage.translation_zh}</p>
      ) : null}

      {popup ? (
        <div
          style={{ position: "fixed", top: popup.top, left: popup.left, zIndex: 50 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onInterested?.(popup.text, passage.text);
              setPopup(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="rounded-full bg-amber-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg active:bg-amber-600"
          >
            感兴趣
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SpeedToggle({ player }: { player: ClipPlayer }) {
  const rates: Array<{ value: number; label: string }> = [
    { value: 0.75, label: "0.75×" },
    { value: 1, label: "1×" },
    { value: 1.5, label: "1.5×" },
    { value: 2, label: "2×" },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">语速</span>
      {rates.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => player.setRate(r.value)}
          className={
            player.rate === r.value
              ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
              : "rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200"
          }
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

interface PlayButtonProps {
  player: ClipPlayer;
  start?: number;
  end?: number;
  label?: string;
}

export function PlayButton({ player, start, end, label = "听" }: PlayButtonProps) {
  if (!player.supported || start === undefined || end === undefined) return null;
  const active = player.activeKey === `${start}:${end}`;
  return (
    <button
      type="button"
      onClick={() => player.toggle(start, end)}
      className={
        active
          ? "inline-flex shrink-0 items-center rounded-full bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-700"
          : "inline-flex shrink-0 items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 active:bg-slate-200"
      }
    >
      {active ? "⏸ 停" : `▶ ${label}`}
    </button>
  );
}
