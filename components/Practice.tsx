"use client";

import { useState } from "react";
import Link from "next/link";
import type { Frame, Lesson, PracticeStage } from "@/lib/types";
import { Speak } from "./Speak";
import { FeedbackForm } from "./FeedbackForm";

interface PracticeProps {
  lesson: Lesson;
}

interface StepDef {
  n: number;
  label: string;
  hint: string;
}

const STEPS: StepDef[] = [
  { n: 1, label: "读", hint: "先大量输入：听懂、跟读，建立语感" },
  { n: 2, label: "句式", hint: "看懂这几个高频、可迁移的句式" },
  { n: 3, label: "看着填", hint: "照着句式，把完整的一句说/写出来" },
  { n: 4, label: "给意思", hint: "只看中文意思，自己把句式调出来" },
  { n: 5, label: "限时脱口", hint: "限时说出来，别想太多，先开口" },
];

// Maps the visible step (3/4/5) to the practice stage the feedback model expects.
const STEP_STAGE: Record<number, PracticeStage> = { 3: "3a", 4: "3b", 5: "4" };

export function Practice({ lesson }: PracticeProps) {
  const [step, setStep] = useState(1);
  const [frameIndex, setFrameIndex] = useState(0);

  const frames = lesson.frames;
  const hasFrames = frames.length > 0;

  function goStep(n: number) {
    setStep(n);
    setFrameIndex(0);
  }

  return (
    <div className="space-y-5">
      <StepBar current={step} onPick={goStep} />

      <p className="text-sm text-slate-500">{STEPS[step - 1].hint}</p>

      {step === 1 ? <InputStage lesson={lesson} /> : null}
      {step === 2 ? <FramesStage frames={frames} /> : null}

      {step >= 3 ? (
        hasFrames ? (
          <FrameWorkspace
            lessonId={lesson.id}
            step={step}
            frames={frames}
            frameIndex={frameIndex}
            onPrev={() => setFrameIndex((i) => Math.max(0, i - 1))}
            onNext={() => setFrameIndex((i) => Math.min(frames.length - 1, i + 1))}
          />
        ) : (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
            这节课没有抽到句式，换一篇材料试试。
          </p>
        )
      ) : null}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => goStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
        >
          ← 上一步
        </button>
        {step < 5 ? (
          <button
            type="button"
            onClick={() => goStep(step + 1)}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white active:bg-slate-700"
          >
            下一步 →
          </button>
        ) : (
          <Link
            href="/"
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white active:bg-emerald-700"
          >
            练完了，回首页
          </Link>
        )}
      </div>
    </div>
  );
}

interface StepBarProps {
  current: number;
  onPick: (n: number) => void;
}

function StepBar({ current, onPick }: StepBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STEPS.map((s) => (
        <button
          key={s.n}
          type="button"
          onClick={() => onPick(s.n)}
          className={
            s.n === current
              ? "inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
              : "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200"
          }
        >
          <span className="tabular-nums">{s.n}</span>
          {s.label}
        </button>
      ))}
    </div>
  );
}

function InputStage({ lesson }: { lesson: Lesson }) {
  const passages = lesson.passages.length > 0 ? lesson.passages : [{ text: lesson.full_text }];
  return (
    <div className="space-y-4">
      {passages.map((p, i) => (
        <div key={i} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          {p.title ? <h3 className="font-medium text-slate-800">{p.title}</h3> : null}
          <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-800">{p.text}</p>
          <Speak text={p.text} />
        </div>
      ))}
    </div>
  );
}

function FramesStage({ frames }: { frames: Frame[] }) {
  if (frames.length === 0) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
        这节课没有抽到句式，换一篇材料试试。
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {frames.map((f, i) => (
        <div key={i} className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-base font-medium text-slate-900">{f.frame}</p>
          <p className="text-sm text-slate-600">例：{f.example}</p>
          <p className="text-sm text-slate-400">{f.meaning_zh}</p>
          <Speak text={f.example} label="听例句" />
        </div>
      ))}
    </div>
  );
}

interface FrameWorkspaceProps {
  lessonId: string;
  step: number;
  frames: Frame[];
  frameIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

function FrameWorkspace({
  lessonId,
  step,
  frames,
  frameIndex,
  onPrev,
  onNext,
}: FrameWorkspaceProps) {
  const frame = frames[frameIndex];
  const stage = STEP_STAGE[step];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={frameIndex === 0}
          className="rounded-full px-3 py-1.5 text-sm text-slate-500 disabled:opacity-40"
        >
          ← 上一句
        </button>
        <span className="text-sm tabular-nums text-slate-400">
          第 {frameIndex + 1} / {frames.length} 句
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={frameIndex === frames.length - 1}
          className="rounded-full px-3 py-1.5 text-sm text-slate-500 disabled:opacity-40"
        >
          下一句 →
        </button>
      </div>

      {step === 3 ? <FillPrompt frame={frame} /> : null}
      {step >= 4 ? <MeaningPrompt key={frameIndex} frame={frame} /> : null}

      <FeedbackForm
        key={`${step}-${frameIndex}`}
        lessonId={lessonId}
        stage={stage}
        promptShown={buildPrompt(step, frame)}
        countdownSeconds={step === 5 ? 20 : undefined}
        placeholder={
          step === 3 ? "照着上面的句式，写出/说出完整的一句……" : "凭这个意思，自己说出英文……"
        }
      />
    </div>
  );
}

function buildPrompt(step: number, frame: Frame): string {
  if (step === 3) return `句式：${frame.frame}`;
  return `中文意思：${frame.meaning_zh}\n目标句式：${frame.frame}`;
}

function FillPrompt({ frame }: { frame: Frame }) {
  return (
    <div className="space-y-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-lg font-medium text-indigo-900">{frame.frame}</p>
      <p className="text-sm text-indigo-700/70">参考：{frame.example}</p>
    </div>
  );
}

function MeaningPrompt({ frame }: { frame: Frame }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="space-y-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-lg font-medium text-indigo-900">{frame.meaning_zh}</p>
      {revealed ? (
        <div className="space-y-1 text-sm text-indigo-700/80">
          <p>句式：{frame.frame}</p>
          <p>例：{frame.example}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="text-sm text-indigo-600 underline-offset-2 hover:underline"
        >
          想不起来？看一眼提示
        </button>
      )}
    </div>
  );
}
