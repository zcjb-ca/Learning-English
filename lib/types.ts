// Shared domain types for lessons, practice, and feedback.

// One timed line from the source subtitle (.lrc). `start`/`end` are in seconds
// and are used to clip the matching segment out of the lesson audio.
export interface SubtitleLine {
  start: number;
  end: number;
  text: string;
}

export interface Passage {
  title?: string;
  text: string;
  // Timing for clipping the matching segment from the lesson audio (seconds).
  start?: number;
  end?: number;
  // The raw subtitle lines this passage was grouped from (each with its own timing).
  lines?: SubtitleLine[];
  // Simplified-Chinese translation of `text`, shown beneath the English in the reader.
  translation_zh?: string;
  // Fixed collocations appearing verbatim in `text`; the reader bolds these substrings.
  collocations?: string[];
}

// A fixed collocation / chunk worth memorizing, e.g. "keep it polite". `start`/`end`
// point at the first passage that contains it, so it can be played from the audio.
export interface Collocation {
  phrase: string;
  meaning_zh: string;
  start?: number;
  end?: number;
}

export interface Frame {
  // A high-frequency, transferable sentence frame, e.g. "First, I ___. Then I ___."
  frame: string;
  // A complete example sentence drawn from or close to the source material.
  example: string;
  // The Chinese meaning the learner must express in stage 3b (retrieve-from-meaning).
  meaning_zh: string;
}

export interface IngestResult {
  passages: Passage[];
  frames: Frame[];
  collocations: Collocation[];
}

export interface Feedback {
  // grammatically acceptable AND on-target for the requested task
  ok: boolean;
  // grammar-corrected version of the learner's sentence
  corrected: string;
  // native-like, idiomatic rewrite
  natural: string;
  // short reason for any grammar fix (Chinese)
  grammar_notes: string;
  // short reason why the natural version sounds better (Chinese)
  naturalness_notes: string;
  // whether the learner used the intended structure (matters most in stage 3b)
  used_target: boolean;
  // one warm line of encouragement (Chinese)
  encouragement: string;
  // a short error category tag, e.g. "past tense" / "article"; null if no real mistake
  mistake_tag: string | null;
}

export interface LessonSummary {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
}

export interface CustomPhrase {
  id: string;
  phrase: string;
  frame: Frame;
  collocation: Collocation;
}

export interface Lesson extends LessonSummary {
  full_text: string;
  // Public URL of the lesson audio (Vercel Blob); null for legacy lessons.
  audio_url: string | null;
  passages: Passage[];
  frames: Frame[];
  collocations: Collocation[];
  customPhrases: CustomPhrase[];
}

export interface MistakeRow {
  id: string;
  lesson_id: string;
  lesson_title: string;
  stage: string;
  prompt_shown: string | null;
  user_input: string | null;
  feedback: Feedback | null;
  mistake_tag: string | null;
  created_at: string;
}

export type PracticeStage = "3a" | "3b" | "4" | "collocation" | "review";
