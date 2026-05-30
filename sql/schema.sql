-- Database schema for the English speaking trainer.
--
-- You normally do NOT need to run this by hand: after deploying, open
-- /api/init once (a button on the home page does this for you) and the app
-- creates these tables itself. This file is kept as a reference and for
-- setting up the database manually if you prefer.

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_filename text,
  full_text text not null,
  audio_url text,
  passages_json jsonb not null default '[]'::jsonb,
  frames_json jsonb not null default '[]'::jsonb,
  collocations_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- If you created the lessons table before audio/collocations existed, run these
-- (the app also does this automatically when you open /api/init):
alter table lessons add column if not exists audio_url text;
alter table lessons add column if not exists collocations_json jsonb not null default '[]'::jsonb;

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id) on delete cascade,
  stage text not null,
  prompt_shown text,
  user_input text,
  feedback_json jsonb,
  is_mistake boolean not null default false,
  mistake_tag text,
  created_at timestamptz not null default now()
);

create index if not exists attempts_lesson_idx on attempts(lesson_id);
create index if not exists attempts_mistake_idx on attempts(created_at desc) where is_mistake;
