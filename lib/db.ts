// Neon serverless Postgres access. All queries use the `neon` tagged-template,
// which sends values as bound parameters (no string interpolation) — safe from
// SQL injection. Server-only.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { requireEnv } from "./env";
import type {
  Collocation,
  Feedback,
  Frame,
  Lesson,
  LessonSummary,
  MistakeRow,
  Passage,
} from "./types";

let cached: NeonQueryFunction<false, false> | null = null;

function sql(): NeonQueryFunction<false, false> {
  if (!cached) cached = neon(requireEnv("DATABASE_URL"));
  return cached;
}

const SCHEMA_STATEMENTS: string[] = [
  `create table if not exists lessons (
     id uuid primary key default gen_random_uuid(),
     title text not null,
     source_filename text,
     full_text text not null,
     audio_url text,
     passages_json jsonb not null default '[]'::jsonb,
     frames_json jsonb not null default '[]'::jsonb,
     collocations_json jsonb not null default '[]'::jsonb,
     created_at timestamptz not null default now()
   )`,
  // Idempotent migrations so an existing install picks up the new columns by
  // re-running /api/init (these are no-ops once the columns exist).
  `alter table lessons add column if not exists audio_url text`,
  `alter table lessons add column if not exists collocations_json jsonb not null default '[]'::jsonb`,
  `create table if not exists attempts (
     id uuid primary key default gen_random_uuid(),
     lesson_id uuid references lessons(id) on delete cascade,
     stage text not null,
     prompt_shown text,
     user_input text,
     feedback_json jsonb,
     is_mistake boolean not null default false,
     mistake_tag text,
     created_at timestamptz not null default now()
   )`,
  `create index if not exists attempts_lesson_idx on attempts(lesson_id)`,
  `create index if not exists attempts_mistake_idx on attempts(created_at desc) where is_mistake`,
];

export async function initSchema(): Promise<void> {
  const db = sql();
  for (const statement of SCHEMA_STATEMENTS) {
    await db.query(statement);
  }
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function listLessons(): Promise<LessonSummary[]> {
  const rows = (await sql()`
    select id, title, source_filename, created_at
    from lessons
    order by created_at desc
  `) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    source_filename: r.source_filename === null ? null : String(r.source_filename),
    created_at: toIso(r.created_at),
  }));
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const rows = (await sql()`
    select id, title, source_filename, full_text, audio_url,
           passages_json, frames_json, collocations_json, created_at
    from lessons
    where id = ${id}
    limit 1
  `) as Array<Record<string, unknown>>;
  const r = rows[0];
  if (!r) return null;
  return {
    id: String(r.id),
    title: String(r.title),
    source_filename: r.source_filename === null ? null : String(r.source_filename),
    full_text: String(r.full_text),
    audio_url: r.audio_url === null || r.audio_url === undefined ? null : String(r.audio_url),
    passages: (r.passages_json as Passage[]) ?? [],
    frames: (r.frames_json as Frame[]) ?? [],
    collocations: (r.collocations_json as Collocation[]) ?? [],
    created_at: toIso(r.created_at),
  };
}

export async function insertLesson(input: {
  title: string;
  sourceFilename: string | null;
  fullText: string;
  audioUrl: string | null;
  passages: Passage[];
  frames: Frame[];
  collocations: Collocation[];
}): Promise<string> {
  const rows = (await sql()`
    insert into lessons
      (title, source_filename, full_text, audio_url, passages_json, frames_json, collocations_json)
    values (
      ${input.title},
      ${input.sourceFilename},
      ${input.fullText},
      ${input.audioUrl},
      ${JSON.stringify(input.passages)}::jsonb,
      ${JSON.stringify(input.frames)}::jsonb,
      ${JSON.stringify(input.collocations)}::jsonb
    )
    returning id
  `) as Array<{ id: string }>;
  return String(rows[0].id);
}

export async function insertAttempt(input: {
  lessonId: string;
  stage: string;
  promptShown: string;
  userInput: string;
  feedback: Feedback;
  isMistake: boolean;
  mistakeTag: string | null;
}): Promise<void> {
  await sql()`
    insert into attempts
      (lesson_id, stage, prompt_shown, user_input, feedback_json, is_mistake, mistake_tag)
    values (
      ${input.lessonId},
      ${input.stage},
      ${input.promptShown},
      ${input.userInput},
      ${JSON.stringify(input.feedback)}::jsonb,
      ${input.isMistake},
      ${input.mistakeTag}
    )
  `;
}

export async function listMistakes(limit = 50): Promise<MistakeRow[]> {
  const rows = (await sql()`
    select a.id, a.lesson_id, l.title as lesson_title, a.stage,
           a.prompt_shown, a.user_input, a.feedback_json, a.mistake_tag, a.created_at
    from attempts a
    join lessons l on l.id = a.lesson_id
    where a.is_mistake
    order by a.created_at desc
    limit ${limit}
  `) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    lesson_id: String(r.lesson_id),
    lesson_title: String(r.lesson_title),
    stage: String(r.stage),
    prompt_shown: r.prompt_shown === null ? null : String(r.prompt_shown),
    user_input: r.user_input === null ? null : String(r.user_input),
    feedback: (r.feedback_json as Feedback) ?? null,
    mistake_tag: r.mistake_tag === null ? null : String(r.mistake_tag),
    created_at: toIso(r.created_at),
  }));
}
