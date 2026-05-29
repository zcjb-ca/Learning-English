// Shared domain types for lessons, practice, and feedback.

export interface Passage {
  title?: string;
  text: string;
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

export interface Lesson extends LessonSummary {
  full_text: string;
  passages: Passage[];
  frames: Frame[];
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

export type PracticeStage = "3a" | "3b" | "4" | "review";
