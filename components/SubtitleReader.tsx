"use client";

import { useState } from "react";
import Highlighter from "react-highlight-words";
import type { Collocation, Passage } from "@/lib/types";
import { FeedbackForm } from "./FeedbackForm";
import { useClipPlayer, type ClipPlayer } from "./useClipPlayer";

interface SubtitleReaderProps {
  lessonId: string;
  passages: Passage[];
  collocations: Collocation[];
  audioUrl: string | null;
}

// Step 1 of the trainer: read along. Shows each passage in English with its
// collocations bolded, the Chinese translation beneath, and a button to play
// just that segment from the real lesson audio. A panel below turns every
// collocation into a make-a-sentence drill.
export function SubtitleReader({
  lessonId,
  passages,
  collocations,
  audioUrl,
}: SubtitleReaderProps) {
  const player = useClipPlayer(audioUrl);
  const shown = passages.length > 0 ? passages : [];

  return (
    <div className="space-y-4">
      {player.supported ? <SpeedToggle player={player} /> : null}

      <div className="space-y-3">
        {shown.map((p, i) => (
          <div
            key={i}
            className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-base leading-relaxed text-slate-800">
                <Highlighter
                  searchWords={p.collocations ?? []}
                  textToHighlight={p.text}
                  highlightTag="strong"
                  highlightClassName="font-semibold text-slate-900"
                  autoEscape
                />
              </p>
              <PlayButton player={player} start={p.start} end={p.end} />
            </div>
            {p.translation_zh ? (
              <p className="text-sm leading-relaxed text-slate-400">{p.translation_zh}</p>
            ) : null}
          </div>
        ))}
      </div>

      {collocations.length > 0 ? (
        <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
          <h3 className="text-sm font-medium text-indigo-900">
            固定搭配（点开就能练造句）
          </h3>
          <ul className="space-y-2">
            {collocations.map((c, i) => (
              <CollocationItem key={i} lessonId={lessonId} collocation={c} player={player} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SpeedToggle({ player }: { player: ClipPlayer }) {
  const rates: Array<{ value: number; label: string }> = [
    { value: 0.75, label: "0.75×" },
    { value: 1, label: "1×" },
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

function PlayButton({ player, start, end, label = "听" }: PlayButtonProps) {
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

interface CollocationItemProps {
  lessonId: string;
  collocation: Collocation;
  player: ClipPlayer;
}

function CollocationItem({ lessonId, collocation, player }: CollocationItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{collocation.phrase}</p>
          <p className="text-sm text-slate-500">{collocation.meaning_zh}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PlayButton player={player} start={collocation.start} end={collocation.end} />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white active:bg-indigo-700"
          >
            {open ? "收起" : "造句练习"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="mt-3">
          <FeedbackForm
            lessonId={lessonId}
            stage="collocation"
            promptShown={`固定搭配：${collocation.phrase}\n意思：${collocation.meaning_zh}`}
            placeholder={`用 “${collocation.phrase}” 造一个自然的句子……`}
          />
        </div>
      ) : null}
    </li>
  );
}

