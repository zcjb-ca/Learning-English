"use client";

import { useState } from "react";
import Link from "next/link";
import type { MistakeRow } from "@/lib/types";
import { FeedbackForm } from "./FeedbackForm";

interface ReviewItemProps {
  mistake: MistakeRow;
}

const STAGE_LABEL: Record<string, string> = {
  "3a": "看着填",
  "3b": "给意思自己说",
  "4": "限时口头",
  review: "复习",
};

export function ReviewItem({ mistake }: ReviewItemProps) {
  const [retrying, setRetrying] = useState(false);

  return (
    <li className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link href={`/lessons/${mistake.lesson_id}/practice`} className="font-medium text-indigo-600">
          {mistake.lesson_title}
        </Link>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
          {STAGE_LABEL[mistake.stage] ?? mistake.stage}
        </span>
        {mistake.mistake_tag ? (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
            {mistake.mistake_tag}
          </span>
        ) : null}
      </div>

      {mistake.prompt_shown ? (
        <p className="whitespace-pre-wrap text-sm text-slate-500">{mistake.prompt_shown}</p>
      ) : null}

      {mistake.user_input ? (
        <p className="text-sm text-slate-400">
          你当时说的：<span className="text-slate-700">{mistake.user_input}</span>
        </p>
      ) : null}

      {mistake.feedback ? (
        <div className="space-y-1 rounded-xl bg-indigo-50 p-3 text-sm">
          <p className="text-indigo-900">地道说法：{mistake.feedback.natural}</p>
        </div>
      ) : null}

      {retrying ? (
        <FeedbackForm
          lessonId={mistake.lesson_id}
          stage="review"
          promptShown={mistake.prompt_shown ?? ""}
          placeholder="再说一次，看看这次怎么样……"
        />
      ) : (
        <button
          type="button"
          onClick={() => setRetrying(true)}
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white active:bg-slate-700"
        >
          再练一次
        </button>
      )}
    </li>
  );
}
