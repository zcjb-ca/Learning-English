"use client";

import type { Feedback } from "@/lib/types";
import { Speak } from "./Speak";

interface FeedbackCardProps {
  feedback: Feedback;
}

// Renders the dual feedback (grammar correctness + naturalness) that is the
// whole point of the method. Always shows the native rewrite with a play button
// so the learner can hear the better version, not just read it.
export function FeedbackCard({ feedback }: FeedbackCardProps) {
  const onTarget = feedback.used_target;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            feedback.ok
              ? "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700"
              : "inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700"
          }
        >
          {feedback.ok ? "✓ 可以这么说" : "需要再调整一下"}
        </span>
        <span
          className={
            onTarget
              ? "inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700"
              : "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
          }
        >
          {onTarget ? "用对了目标句式" : "没用到目标句式"}
        </span>
        {feedback.mistake_tag ? (
          <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
            {feedback.mistake_tag}
          </span>
        ) : null}
      </div>

      <section className="space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          语法订正
        </h4>
        <p className="text-base text-slate-900">{feedback.corrected}</p>
        {feedback.grammar_notes ? (
          <p className="text-sm text-slate-500">{feedback.grammar_notes}</p>
        ) : null}
      </section>

      <section className="space-y-2 rounded-xl bg-indigo-50 p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
          母语者会这样说
        </h4>
        <p className="text-base font-medium text-indigo-900">{feedback.natural}</p>
        {feedback.naturalness_notes ? (
          <p className="text-sm text-indigo-700/80">{feedback.naturalness_notes}</p>
        ) : null}
        <Speak text={feedback.natural} label="听地道版" />
      </section>

      {feedback.encouragement ? (
        <p className="text-sm italic text-slate-500">{feedback.encouragement}</p>
      ) : null}
    </div>
  );
}
