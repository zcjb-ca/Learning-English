"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Feedback, PracticeStage } from "@/lib/types";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { FeedbackCard } from "./FeedbackCard";

interface FeedbackFormProps {
  lessonId: string;
  stage: PracticeStage;
  // What the learner is responding to (the frame with a blank, or the Chinese
  // meaning). Sent to the model so feedback knows the target.
  promptShown: string;
  placeholder?: string;
  // When set (stage 4), shows a timed-challenge button that starts a countdown
  // plus the mic, to push the learner to speak without over-thinking.
  countdownSeconds?: number;
}

export function FeedbackForm({
  lessonId,
  stage,
  promptShown,
  placeholder = "在这里说或写出你的英文……",
  countdownSeconds,
}: FeedbackFormProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const speech = useSpeechRecognition();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSecondsLeft(null);
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  const appendChunk = useCallback((chunk: string) => {
    setText((prev) => (prev ? `${prev} ${chunk}` : chunk).trim());
  }, []);

  const toggleMic = useCallback(() => {
    if (speech.listening) {
      speech.stop();
    } else {
      setError(null);
      speech.start(appendChunk);
    }
  }, [speech, appendChunk]);

  const startChallenge = useCallback(() => {
    if (countdownSeconds === undefined) return;
    setError(null);
    setFeedback(null);
    setText("");
    if (speech.supported) speech.start(appendChunk);
    setSecondsLeft(countdownSeconds);
    stopTimer();
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          speech.stop();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [countdownSeconds, speech, appendChunk, stopTimer]);

  async function submit() {
    const userInput = text.trim();
    if (!userInput) {
      setError("先说点或写点什么再提交。");
      return;
    }
    if (speech.listening) speech.stop();
    stopTimer();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, stage, promptShown, userInput }),
      });
      const data: { feedback?: Feedback; error?: string } = await res.json();
      if (!res.ok || !data.feedback) {
        setError(data.error ?? "出了点问题，请重试。");
        return;
      }
      setFeedback(data.feedback);
    } catch {
      setError("网络出错了，请重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {countdownSeconds !== undefined ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={startChallenge}
            disabled={secondsLeft !== null}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white active:bg-rose-700 disabled:opacity-50"
          >
            ▶ 限时挑战（{countdownSeconds} 秒）
          </button>
          {secondsLeft !== null ? (
            <span className="text-lg font-semibold tabular-nums text-rose-600">
              {secondsLeft}s
            </span>
          ) : null}
        </div>
      ) : null}

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white active:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "批改中……" : "提交，看反馈"}
        </button>

        {speech.supported ? (
          <button
            type="button"
            onClick={toggleMic}
            className={
              speech.listening
                ? "inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700"
                : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 active:bg-slate-200"
            }
          >
            {speech.listening ? "● 录音中，点此停止" : "🎤 用说的"}
          </button>
        ) : null}

        {text ? (
          <button
            type="button"
            onClick={() => setText("")}
            className="text-sm text-slate-400 underline-offset-2 hover:underline"
          >
            清空
          </button>
        ) : null}
      </div>

      {!speech.supported ? (
        <p className="text-xs text-slate-400">
          这台设备的浏览器不支持语音输入（iPhone 上很常见），直接打字即可。
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {feedback ? <FeedbackCard feedback={feedback} /> : null}
    </div>
  );
}
