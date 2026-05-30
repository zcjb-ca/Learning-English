"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Plays timed CLIPS out of one lesson audio file. A single hidden <audio> is
// created lazily on the first user gesture (so iOS lets it play), and each
// clip is bounded by watching `timeupdate` and pausing once we pass `end`.
export interface ClipPlayer {
  // False when the lesson has no audio (legacy lessons) — callers hide play UI.
  supported: boolean;
  // Playback speed; 0.75 helps the learner catch fast native speech.
  rate: number;
  setRate: (rate: number) => void;
  // Key (`start:end`) of the clip currently playing, or null. Drives ▶/⏸ state.
  activeKey: string | null;
  // Play the [start, end] clip, or pause it if it's the one already playing.
  toggle: (start: number, end: number) => void;
  stop: () => void;
}

function clipKey(start: number, end: number): string {
  return `${start}:${end}`;
}

export function useClipPlayer(audioUrl: string | null): ClipPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endRef = useRef<number>(0);
  const rateRef = useRef<number>(1);
  const activeKeyRef = useRef<string | null>(null);

  const [rate, setRateState] = useState(1);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const setActive = useCallback((key: string | null) => {
    activeKeyRef.current = key;
    setActiveKey(key);
  }, []);

  // Lazily build the element on first use so creation happens inside a click
  // handler (required for autoplay on iOS Safari).
  const getAudio = useCallback((): HTMLAudioElement | null => {
    if (!audioUrl) return null;
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(audioUrl);
    audio.preload = "metadata";
    audio.addEventListener("timeupdate", () => {
      if (audio.currentTime >= endRef.current) {
        audio.pause();
        setActive(null);
      }
    });
    audio.addEventListener("ended", () => setActive(null));
    audioRef.current = audio;
    return audio;
  }, [audioUrl, setActive]);

  const toggle = useCallback(
    (start: number, end: number) => {
      const audio = getAudio();
      if (!audio) return;
      const key = clipKey(start, end);
      if (activeKeyRef.current === key) {
        audio.pause();
        setActive(null);
        return;
      }
      endRef.current = end;
      audio.playbackRate = rateRef.current;
      try {
        audio.currentTime = start;
      } catch {
        // currentTime can throw before metadata loads; play() below still seeks.
      }
      setActive(key);
      audio.play().catch(() => setActive(null));
    },
    [getAudio, setActive],
  );

  const setRate = useCallback((next: number) => {
    rateRef.current = next;
    setRateState(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    setActive(null);
  }, [setActive]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      audioRef.current = null;
    };
  }, []);

  return { supported: audioUrl !== null, rate, setRate, activeKey, toggle, stop };
}
