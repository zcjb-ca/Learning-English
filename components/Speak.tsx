"use client";

import { useEffect, useState } from "react";

interface SpeakProps {
  text: string;
  label?: string;
}

// Text-to-speech using the browser SpeechSynthesis API (reliable on iOS, Android,
// and desktop). Lets the learner replay the model audio and slow it down.
export function Speak({ text, label = "朗读" }: SpeakProps) {
  const [rate, setRate] = useState(0.9);
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function play() {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  if (!supported) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={speaking ? stop : play}
        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white active:bg-indigo-700"
      >
        {speaking ? "■ 停止" : `▶ ${label}`}
      </button>
      <label className="flex items-center gap-2 text-xs text-slate-500">
        语速 {rate.toFixed(1)}×
        <input
          type="range"
          min={0.5}
          max={1}
          step={0.1}
          value={rate}
          onChange={(event) => setRate(Number.parseFloat(event.target.value))}
          className="accent-indigo-600"
        />
      </label>
    </div>
  );
}
