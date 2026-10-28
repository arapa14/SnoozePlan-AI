-- =============================================================================
-- SnoozePlan AI  |  supabase/migrations/001_init_schema.sql
-- Target: Supabase (PostgreSQL 15+, Supabase Auth, RLS)
--
-- Urutan isi file:
--   0. Ekstensi & helper
--   1. Enum
--   2. Profil, preferensi (jam tidur, bobot, persona), riwayat kalibrasi
--   3. Jadwal tetap (kuliah/praktikum) + pengecualian
--   4. Chat (percakapan, pesan)
--   5. Tugas, riwayat tugas (task_events), log durasi (task_logs)
--   6. Jadwal: rencana (plan) versi-versi + blok jadwal
--   7. Riwayat optimasi/reschedule + diff per blok
--   8. Aksi chat, kuota AI
--   9. Fungsi: Sleep-Guard, RPC apply/reject reschedule, kuota AI
--  10. Trigger
--  11. View
--  12. Row Level Security & grants
--  13. Seed persona
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EKSTENSI & HELPER
-- ---------------------------------------------------------------------------
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;  -- untuk exclusion constraint

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 1. ENUM
-- ---------------------------------------------------------------------------
create type public.task_category      as enum ('kuliah', 'praktikum', 'organisasi', 'pribadi');
create type public.task_status        as enum ('todo', 'in_progress', 'done', 'cancelled');
create type public.plan_status        as enum ('proposed', 'active', 'superseded', 'rejected');
create type public.reschedule_status  as enum ('proposed', 'approved', 'rejected', 'expired', 'failed');
create type public.reschedule_trigger as enum (
  'task_added', 'task_updated', 'task_completed', 'task_deleted',
  'fixed_schedule_changed', 'weights_changed', 'chat', 'manual'
);
create type public.change_type        as enum ('added', 'removed', 'modified');
create type public.chat_role          as enum ('user', 'assistant');
create type public.chat_action_type   as enum (
  'create_task', 'update_task', 'complete_task', 'delete_task', 'request_reschedule'
);
create type public.chat_action_status as enum ('proposed', 'applied', 'rejected', 'undone', 'failed');

-- ---------------------------------------------------------------------------
-- 2. PROFIL, PREFERENSI, PERSONA
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  display_name  text,
  avatar_url    text,
  student_id    text,                                   -- NIM
  study_program text,
  cohort_year   smallint check (cohort_year between 2000 and 2100),
  university    text not null default 'Universitas Negeri Jakarta',
  faculty       text not null default 'FMIPA',
  timezone      text not null default 'Asia/Jakarta',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.profiles_before_write()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Zona waktu tidak valid: %', new.timezone using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Preset persona (data sistem, dibaca semua pengguna login).
create table public.persona_presets (
  key            text primary key,
  name           text not null,
  description    text,
  w_urgency      numeric(4,3) not null check (w_urgency      between 0 and 1),
  w_importance   numeric(4,3) not null check (w_importance   between 0 and 1),
  w_consequence  numeric(4,3) not null check (w_consequence  between 0 and 1),
  w_duration     numeric(4,3) not null check (w_duration     between 0 and 1),
  w_availability numeric(4,3) not null check (w_availability between 0 and 1),
  sort_order     smallint not null default 0,
  check (w_urgency + w_importance + w_consequence + w_duration + w_availability > 0)
);

-- Pengaturan per pengguna: tidur, jam aktif, pola kerja, bobot prioritas, perilaku AI.
create table public.user_preferences (
  user_id        uuid primary key references public.profiles(user_id) on delete cascade,

  -- Jam tidur (default 8 jam: 22:00 -> 06:00). Jendela boleh melewati tengah malam.
  sleep_start    time not null default '22:00',
  sleep_end      time not null default '06:00',
  min_sleep_hours numeric(3,1) not null default 8.0 check (min_sleep_hours between 4 and 12),

  -- Jam aktif & pola kerja
  active_start   time not null default '06:00',
  active_end     time not null default '22:00',
  peak_start     time,                                  -- jam paling fokus (opsional)
  peak_end       time,
  work_block_minutes     smallint not null default 50  check (work_block_minutes between 15 and 240),
  break_minutes          smallint not null default 10  check (break_minutes between 0 and 60),
  max_daily_work_minutes smallint not null default 480 check (max_daily_work_minutes between 60 and 960),
  planning_horizon_days  smallint not null default 7   check (planning_horizon_days between 1 and 30),

  -- Persona & bobot Adaptive Priority Scoring (dapat dikalibrasi pengguna).
  -- Engine menormalisasi bobot, jadi total tidak harus tepat 1.
  persona_key    text not null default 'balanced' references public.persona_presets(key),
  is_customized  boolean not null default false,       -- true bila bobot diubah dari preset
  w_urgency      numeric(4,3) not null default 0.300 check (w_urgency      between 0 and 1),
  w_importance   numeric(4,3) not null default 0.250 check (w_importance   between 0 and 1),
  w_consequence  numeric(4,3) not null default 0.200 check (w_consequence  between 0 and 1),
  w_duration     numeric(4,3) not null default 0.100 check (w_duration     between 0 and 1),
  w_availability numeric(4,3) not null default 0.150 check (w_availability between 0 and 1),
  weights_version int not null default 1,              -- naik otomatis tiap bobot berubah

  -- Perilaku AI
  ai_enabled          boolean not null default true,
  chat_auto_add_tasks boolean not null default true,   -- chat langsung menambah tugas (bisa di-undo)

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint prefs_weights_positive check
    (w_urgency + w_importance + w_consequence + w_duration + w_availability > 0),
  constraint prefs_sleep_window_ok check
    (mod((extract(epoch from (sleep_end - sleep_start)) / 3600.0 + 24)::numeric, 24::numeric) >= min_sleep_hours),
  constraint prefs_peak_pair check ((peak_start is null) = (peak_end is null))
);

-- Riwayat kalibrasi bobot (bahan analisis kalibrasi pada penelitian).
create table public.weight_calibrations (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles(user_id) on delete cascade,
  persona_key    text,
  w_urgency      numeric(4,3) not null,
  w_importance   numeric(4,3) not null,
  w_consequence  numeric(4,3) not null,
  w_duration     numeric(4,3) not null,
  w_availability numeric(4,3) not null,
  weights_version int not null,
  source         text not null check (source in ('default', 'preset', 'manual')),
  created_at     timestamptz not null default now()
);
create index weight_calibrations_user_idx on public.weight_calibrations (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. JADWAL TETAP
-- ---------------------------------------------------------------------------
create table public.fixed_schedules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(user_id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  category    public.task_category not null default 'kuliah',
  day_of_week smallint not null check (day_of_week between 1 and 7),   -- ISO: 1=Senin ... 7=Minggu
  start_time  time not null,
  end_time    time not null,
  location    text,
  valid_from  date,                                     -- mis. awal semester
  valid_until date,                                     -- mis. akhir semester
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_time > start_time),
  check (valid_until is null or valid_from is null or valid_until >= valid_from),
  unique (id, user_id)
);
create index fixed_schedules_user_day_idx on public.fixed_schedules (user_id, day_of_week) where is_active;

-- Kuliah dibatalkan / dipindah pada tanggal tertentu (pemicu utama rescheduling).
create table public.fixed_schedule_exceptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,
  schedule_id    uuid not null,
  on_date        date not null,                         -- tanggal kemunculan asli
  kind           text not null check (kind in ('cancelled', 'moved')),
  new_date       date,                                  -- null = tanggal sama
  new_start_time time,
  new_end_time   time,
  note           text,
  created_at     timestamptz not null default now(),
  foreign key (schedule_id, user_id) references public.fixed_schedules (id, user_id) on delete cascade,
  unique (schedule_id, on_date),
  check (kind = 'cancelled' or (new_start_time is not null and new_end_time is not null and new_end_time > new_start_time))
);

-- ---------------------------------------------------------------------------
-- 4. CHAT
-- ---------------------------------------------------------------------------
create table public.chat_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(user_id) on delete cascade,
  title       text,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id)
);
create index chat_conversations_user_idx on public.chat_conversations (user_id, updated_at desc);

create table public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id         uuid not null,
  role            public.chat_role not null,
  content         text not null,
  model           text,                                  -- mis. gemini-2.5-flash (untuk pesan assistant)
  metadata        jsonb not null default '{}'::jsonb,    -- token, latensi, dll.
  created_at      timestamptz not null default now(),
  foreign key (conversation_id, user_id) references public.chat_conversations (id, user_id) on delete cascade
);
create index chat_messages_conv_idx on public.chat_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- 5. TUGAS, RIWAYAT TUGAS, LOG DURASI
-- ---------------------------------------------------------------------------
create table public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(user_id) on delete cascade,

  title              text not null check (char_length(title) between 1 and 200),
  description        text,
  category           public.task_category not null default 'kuliah',
  status             public.task_status   not null default 'todo',

  deadline           timestamptz,                        -- null = tanpa tenggat (urgensi 0)
  importance         smallint not null default 3 check (importance between 1 and 5),
  late_consequence   smallint not null default 3 check (late_consequence between 1 and 5),
  estimated_minutes  integer  not null default 60 check (estimated_minutes between 5 and 1440),
  estimate_source    text     not null default 'default'
                       check (estimate_source in ('default', 'user', 'ai', 'learned')),

  -- Aturan penempatan
  is_splittable      boolean  not null default true,
  min_chunk_minutes  smallint not null default 30 check (min_chunk_minutes >= 5),
  fixed_start_at     timestamptz,                        -- acara berwaktu tetap (tidak digeser planner)
  fixed_end_at       timestamptz,

  -- Cache skor (dihitung ulang shared/priority.ts; nilainya bergantung waktu sehingga cepat basi)
  priority_score         numeric(5,2) check (priority_score between 0 and 100),
  priority_factors       jsonb,                          -- {urgency, importance, consequence, duration, availability}
  priority_reason        text,
  priority_reason_source text check (priority_reason_source in ('template', 'ai')),
  priority_computed_at   timestamptz,
  weights_version        int,                            -- versi bobot saat skor dihitung

  -- Pengingat & snooze
  remind_at          timestamptz,
  snoozed_until      timestamptz,
  snooze_count       integer not null default 0 check (snooze_count >= 0),

  -- Penyelesaian
  completed_at       timestamptz,
  actual_minutes     integer check (actual_minutes between 1 and 2880),
  archived_at        timestamptz,

  source             text not null default 'manual' check (source in ('manual', 'chat', 'import')),
  source_message_id  uuid references public.chat_messages(id) on delete set null,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  check ((fixed_start_at is null) = (fixed_end_at is null)),
  check (fixed_end_at is null or fixed_end_at > fixed_start_at)
);
create index tasks_user_ranked_idx   on public.tasks (user_id, priority_score desc nulls last)
  where status in ('todo', 'in_progress') and archived_at is null;
create index tasks_user_deadline_idx on public.tasks (user_id, deadline)
  where status in ('todo', 'in_progress') and archived_at is null;
create index tasks_user_status_idx   on public.tasks (user_id, status, updated_at desc);

-- Riwayat perubahan tugas (history to-do list). Ditulis trigger, tidak bisa dipalsukan klien.
-- task_id sengaja TANPA foreign key agar riwayat tetap ada setelah tugas dihapus.
create table public.task_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  task_id    uuid not null,
  task_title text not null,
  event_type text not null check (event_type in
    ('created', 'updated', 'status_changed', 'completed', 'reopened', 'snoozed', 'deleted')),
  changes    jsonb not null default '{}'::jsonb,          -- {kolom: {from, to}}; created/deleted: {after}/{before}
  actor      text not null default 'user' check (actor in ('user', 'ai', 'system')),
  created_at timestamptz not null default now()
);
create index task_events_user_idx on public.task_events (user_id, created_at desc);
create index task_events_task_idx on public.task_events (task_id, created_at);

-- Data belajar estimator durasi: estimasi vs aktual (diisi trigger saat tugas selesai).
create table public.task_logs (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references public.profiles(user_id) on delete cascade,
  task_id           uuid unique references public.tasks(id) on delete set null,
  category          public.task_category not null,
  estimated_minutes integer not null,
  actual_minutes    integer,
  deadline          timestamptz,
  completed_at      timestamptz not null,
  was_late          boolean,
  snooze_count      integer not null default 0,
  created_at        timestamptz not null default now()
);
create index task_logs_user_cat_idx on public.task_logs (user_id, category);

-- ---------------------------------------------------------------------------
-- 6. JADWAL: RENCANA (VERSI) + BLOK
--    Diff = membandingkan blok dua rencana. Hanya satu rencana 'active' per pengguna.
-- ---------------------------------------------------------------------------
create table public.schedule_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(user_id) on delete cascade,
  version       int  not null,                            -- diisi trigger (urut per pengguna)
  status        public.plan_status not null default 'proposed',
  generated_by  text not null default 'planner' check (generated_by in ('planner', 'ai', 'manual')),
  horizon_start timestamptz not null,
  horizon_end   timestamptz not null,
  summary       text,
  created_at    timestamptz not null default now(),
  activated_at  timestamptz,
  check (horizon_end > horizon_start),
  unique (id, user_id),
  unique (user_id, version)
);
create unique index schedule_plans_one_active_idx on public.schedule_plans (user_id) where status = 'active';
create index schedule_plans_user_idx on public.schedule_plans (user_id, created_at desc);

create table public.scheduled_blocks (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null,
  user_id    uuid not null,
  task_id    uuid references public.tasks(id) on delete set null,
  task_title text,                                        -- snapshot, tetap terbaca di riwayat
  kind       text not null default 'work' check (kind in ('work', 'break')),
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  chunk_index smallint not null default 1,
  is_locked  boolean not null default false,              -- disematkan pengguna (mengabaikan Sleep-Guard)
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  foreign key (plan_id, user_id) references public.schedule_plans (id, user_id) on delete cascade,
  constraint scheduled_blocks_no_overlap
    exclude using gist (plan_id with =, tstzrange(start_at, end_at, '[)') with &&)
);
create index scheduled_blocks_plan_idx on public.scheduled_blocks (plan_id, start_at);
create index scheduled_blocks_user_idx on public.scheduled_blocks (user_id, start_at);
create index scheduled_blocks_task_idx on public.scheduled_blocks (task_id);

-- ---------------------------------------------------------------------------
-- 7. RIWAYAT OPTIMASI (RESCHEDULE) + DIFF
-- ---------------------------------------------------------------------------
create table public.reschedule_runs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(user_id) on delete cascade,
  trigger          public.reschedule_trigger not null,
  trigger_task_id  uuid,                                   -- tanpa FK (tugas bisa dihapus)
  trigger_event_id bigint references public.task_events(id) on delete set null,
  trigger_note     text,
  chat_message_id  uuid references public.chat_messages(id) on delete set null,

  status           public.reschedule_status not null default 'proposed',
  before_plan_id   uuid references public.schedule_plans(id) on delete set null,
  after_plan_id    uuid references public.schedule_plans(id) on delete set null,

  strategy         text not null default 'deterministic' check (strategy in ('deterministic', 'ai')),
  model            text,
  attempts         smallint not null default 1,
  validator_passed boolean,
  validator_report jsonb,                                  -- pelanggaran yang ditolak validator
  ai_summary       text,                                   -- penjelasan ringkas untuk Diff View
  metrics          jsonb,                                  -- {before:{...}, after:{...}} beban, keterlambatan, jam tidur
  error            text,

  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  unique (id, user_id),
  check (status not in ('approved', 'rejected', 'expired') or decided_at is not null)
);
create index reschedule_runs_user_idx on public.reschedule_runs (user_id, created_at desc);

-- Diff per blok/tugas agar riwayat mudah ditampilkan tanpa membandingkan ulang dua rencana.
create table public.reschedule_changes (
  id           bigint generated always as identity primary key,
  run_id       uuid not null,
  user_id      uuid not null,
  task_id      uuid,
  task_title   text not null,
  change_type  public.change_type not null,
  before_start timestamptz,
  before_end   timestamptz,
  after_start  timestamptz,
  after_end    timestamptz,
  reason       text,
  foreign key (run_id, user_id) references public.reschedule_runs (id, user_id) on delete cascade,
  check (change_type = 'added'   or (before_start is not null and before_end is not null)),
  check (change_type = 'removed' or (after_start  is not null and after_end  is not null))
);
create index reschedule_changes_run_idx on public.reschedule_changes (run_id);

-- ---------------------------------------------------------------------------
-- 8. AKSI CHAT & KUOTA AI
-- ---------------------------------------------------------------------------
-- Setiap hasil parsing Gemini dari chat dicatat sebagai aksi (tervalidasi Zod),
-- sehingga bisa diaudit, ditolak, atau di-undo.
create table public.chat_actions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(user_id) on delete cascade,
  message_id        uuid not null references public.chat_messages(id) on delete cascade,
  action_type       public.chat_action_type not null,
  payload           jsonb not null,                        -- tugas terstruktur hasil parsing
  status            public.chat_action_status not null default 'proposed',
  task_id           uuid references public.tasks(id) on delete set null,
  reschedule_run_id uuid references public.reschedule_runs(id) on delete set null,
  error             text,
  created_at        timestamptz not null default now(),
  applied_at        timestamptz
);
create index chat_actions_message_idx on public.chat_actions (message_id);
create index chat_actions_user_idx    on public.chat_actions (user_id, status);

create table public.ai_usage (
  user_id       uuid not null references public.profiles(user_id) on delete cascade,
  usage_date    date not null,
  feature       text not null check (feature in ('chat', 'parse_task', 'explain_priority', 'suggest_reschedule')),
  request_count integer not null default 0,
  input_tokens  bigint  not null default 0,
  output_tokens bigint  not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (user_id, usage_date, feature)
);

-- ---------------------------------------------------------------------------
-- 9. FUNGSI
-- ---------------------------------------------------------------------------

-- 9a. Sleep-Guard: apakah rentang waktu menyentuh jam tidur pengguna (zona waktu lokal)?
create or replace function public.block_violates_sleep(p_user uuid, p_start timestamptz, p_end timestamptz)
returns boolean language plpgsql stable set search_path = public as $$
declare
  v_tz text; v_ss time; v_se time; v_len interval; v_ls timestamp; v_le timestamp;
begin
  select pr.timezone, up.sleep_start, up.sleep_end into v_tz, v_ss, v_se
  from public.profiles pr join public.user_preferences up on up.user_id = pr.user_id
  where pr.user_id = p_user;
  if not found then return false; end if;

  v_len := case when v_se > v_ss then v_se - v_ss else v_se - v_ss + interval '24 hours' end;
  v_ls  := p_start at time zone v_tz;
  v_le  := p_end   at time zone v_tz;

  return exists (
    select 1
    from generate_series((v_ls::date - 1)::timestamp, v_le::date::timestamp, interval '1 day') as g(d)
    where v_ls < g.d + v_ss + v_len and v_le > g.d + v_ss
  );
end $$;

-- 9b. Bentrok dengan jadwal tetap (memperhitungkan pembatalan/pemindahan).
create or replace function public.block_hits_fixed(p_user uuid, p_start timestamptz, p_end timestamptz)
returns boolean language plpgsql stable set search_path = public as $$
declare
  v_tz text; v_ls timestamp; v_le timestamp;
begin
  select timezone into v_tz from public.profiles where user_id = p_user;
  if v_tz is null then return false; end if;
  v_ls := p_start at time zone v_tz;
  v_le := p_end   at time zone v_tz;

  return exists (
    select 1
    from generate_series(v_ls::date::timestamp, v_le::date::timestamp, interval '1 day') as g(d)
    join public.fixed_schedules fs
      on fs.user_id = p_user and fs.is_active
     and fs.day_of_week = extract(isodow from g.d)::int
     and (fs.valid_from  is null or g.d::date >= fs.valid_from)
     and (fs.valid_until is null or g.d::date <= fs.valid_until)
    where not exists (select 1 from public.fixed_schedule_exceptions ex
                      where ex.schedule_id = fs.id and ex.on_date = g.d::date)
      and v_ls < g.d + fs.end_time and v_le > g.d + fs.start_time
    union all
    select 1
    from public.fixed_schedule_exceptions ex
    join public.fixed_schedules fs on fs.id = ex.schedule_id and fs.is_active
    where ex.user_id = p_user and ex.kind = 'moved'
      and coalesce(ex.new_date, ex.on_date) between v_ls::date and v_le::date
      and v_ls < coalesce(ex.new_date, ex.on_date) + ex.new_end_time
      and v_le > coalesce(ex.new_date, ex.on_date) + ex.new_start_time
  );
end $$;

-- 9c. Terapkan usulan reschedule: hanya lewat RPC ini rencana bisa menjadi 'active'.
create or replace function public.apply_reschedule(p_run_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_run  public.reschedule_runs%rowtype;
  v_active uuid;
begin
  if v_user is null then raise exception 'Tidak terautentikasi' using errcode = '28000'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1));

  select * into v_run from public.reschedule_runs where id = p_run_id and user_id = v_user for update;
  if not found then raise exception 'Reschedule run tidak ditemukan'; end if;
  if v_run.status <> 'proposed' then raise exception 'Run sudah diproses (status: %)', v_run.status; end if;
  if v_run.after_plan_id is null then raise exception 'Run tidak memiliki jadwal baru'; end if;

  perform 1 from public.schedule_plans
   where id = v_run.after_plan_id and user_id = v_user and status = 'proposed';
  if not found then raise exception 'Rencana usulan tidak valid'; end if;

  -- Usulan dibuat dari rencana aktif yang sudah berubah -> kedaluwarsa, minta susun ulang.
  select id into v_active from public.schedule_plans where user_id = v_user and status = 'active';
  if v_run.before_plan_id is distinct from v_active then
    update public.reschedule_runs set status = 'expired', decided_at = now() where id = v_run.id;
    update public.schedule_plans  set status = 'rejected' where id = v_run.after_plan_id;
    return 'expired';
  end if;

  update public.schedule_plans set status = 'superseded' where user_id = v_user and status = 'active';
  update public.schedule_plans set status = 'active', activated_at = now() where id = v_run.after_plan_id;
  update public.reschedule_runs set status = 'approved', decided_at = now() where id = v_run.id;
  return 'applied';
end $$;

create or replace function public.reject_reschedule(p_run_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_run  public.reschedule_runs%rowtype;
begin
  if v_user is null then raise exception 'Tidak terautentikasi' using errcode = '28000'; end if;
  select * into v_run from public.reschedule_runs
   where id = p_run_id and user_id = v_user and status = 'proposed' for update;
  if not found then raise exception 'Run tidak ditemukan atau sudah diproses'; end if;

  update public.reschedule_runs set status = 'rejected', decided_at = now() where id = v_run.id;
  update public.schedule_plans  set status = 'rejected'
   where id = v_run.after_plan_id and user_id = v_user and status = 'proposed';
end $$;

-- 9d. Kuota AI harian (dipanggil Edge Function dengan service role).
create or replace function public.consume_ai_quota(p_user uuid, p_feature text, p_daily_limit int default 30)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_used  int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 2));
  select coalesce(sum(request_count), 0) into v_used
    from public.ai_usage where user_id = p_user and usage_date = v_today;
  if v_used >= p_daily_limit then return false; end if;

  insert into public.ai_usage (user_id, usage_date, feature, request_count)
  values (p_user, v_today, p_feature, 1)
  on conflict (user_id, usage_date, feature)
  do update set request_count = public.ai_usage.request_count + 1, updated_at = now();
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- 10. TRIGGER
-- ---------------------------------------------------------------------------

-- 10a. Akun baru -> profil + preferensi default
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 10b. profiles & updated_at tabel lain
create trigger profiles_before_write before insert or update on public.profiles
  for each row execute function public.profiles_before_write();
create trigger fixed_schedules_updated_at before update on public.fixed_schedules
  for each row execute function public.set_updated_at();
create trigger chat_conversations_updated_at before update on public.chat_conversations
  for each row execute function public.set_updated_at();

-- 10c. Preferensi: naikkan weights_version & catat riwayat kalibrasi
create or replace function public.prefs_before_write()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and
     (new.w_urgency, new.w_importance, new.w_consequence, new.w_duration, new.w_availability)
     is distinct from
     (old.w_urgency, old.w_importance, old.w_consequence, old.w_duration, old.w_availability) then
    new.weights_version := old.weights_version + 1;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.prefs_log_calibration()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.weights_version <> old.weights_version then
    insert into public.weight_calibrations
      (user_id, persona_key, w_urgency, w_importance, w_consequence, w_duration, w_availability,
       weights_version, source)
    values
      (new.user_id, new.persona_key, new.w_urgency, new.w_importance, new.w_consequence,
       new.w_duration, new.w_availability, new.weights_version,
       case when tg_op = 'INSERT' then 'default'
            when new.persona_key is distinct from old.persona_key then 'preset'
            else 'manual' end);
  end if;
  return new;
end $$;

create trigger prefs_before_write before insert or update on public.user_preferences
  for each row execute function public.prefs_before_write();
create trigger prefs_log_calibration after insert or update on public.user_preferences
  for each row execute function public.prefs_log_calibration();

-- 10d. Tugas: updated_at, completed_at otomatis
create or replace function public.tasks_before_write()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    if new.status = 'done' then
      new.completed_at := coalesce(new.completed_at, now());
    else
      new.completed_at := null;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger tasks_before_write before insert or update on public.tasks
  for each row execute function public.tasks_before_write();

-- Hapus blok tugas dari rencana yang masih berjalan (riwayat/superseded dibiarkan).
create or replace function public.tasks_before_delete()
returns trigger language plpgsql set search_path = public as $$
begin
  delete from public.scheduled_blocks b
  using public.schedule_plans p
  where b.task_id = old.id and b.plan_id = p.id and p.status in ('proposed', 'active');
  return old;
end $$;

create trigger tasks_before_delete before delete on public.tasks
  for each row execute function public.tasks_before_delete();

-- 10e. Riwayat tugas (task_events). Aktor dapat diatur Edge Function: set_config('app.actor','ai',true).
create or replace function public.log_task_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor text := coalesce(nullif(current_setting('app.actor', true), ''), 'user');
  v_noise text[] := array['updated_at', 'priority_score', 'priority_factors', 'priority_reason',
                          'priority_reason_source', 'priority_computed_at', 'weights_version'];
  v_old jsonb; v_new jsonb; v_diff jsonb; v_type text;
begin
  if v_actor not in ('user', 'ai', 'system') then v_actor := 'user'; end if;

  if tg_op = 'INSERT' then
    insert into public.task_events (user_id, task_id, task_title, event_type, changes, actor)
    values (new.user_id, new.id, new.title, 'created',
            jsonb_build_object('after', to_jsonb(new) - v_noise), v_actor);
    return new;

  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old) - v_noise;
    v_new := to_jsonb(new) - v_noise;
    if v_old = v_new then return new; end if;   -- hanya perubahan skor: tidak dicatat

    select jsonb_object_agg(t.k, jsonb_build_object('from', v_old -> t.k, 'to', v_new -> t.k))
      into v_diff
      from jsonb_object_keys(v_new) as t(k)
     where (v_old -> t.k) is distinct from (v_new -> t.k);

    v_type := case
      when old.status <> 'done' and new.status = 'done' then 'completed'
      when old.status = 'done'  and new.status <> 'done' then 'reopened'
      when old.status <> new.status then 'status_changed'
      when new.snooze_count > old.snooze_count then 'snoozed'
      else 'updated' end;

    insert into public.task_events (user_id, task_id, task_title, event_type, changes, actor)
    values (new.user_id, new.id, new.title, v_type, coalesce(v_diff, '{}'::jsonb), v_actor);
    return new;

  else  -- DELETE
    insert into public.task_events (user_id, task_id, task_title, event_type, changes, actor)
    values (old.user_id, old.id, old.title, 'deleted',
            jsonb_build_object('before', to_jsonb(old) - v_noise), v_actor);
    return old;
  end if;
end $$;

create trigger tasks_log_event after insert or update or delete on public.tasks
  for each row execute function public.log_task_event();

-- 10f. Tugas selesai -> catat estimasi vs aktual untuk estimator durasi
create or replace function public.sync_task_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.task_logs
    (user_id, task_id, category, estimated_minutes, actual_minutes, deadline, completed_at, was_late, snooze_count)
  values
    (new.user_id, new.id, new.category, new.estimated_minutes, new.actual_minutes, new.deadline,
     new.completed_at,
     case when new.deadline is null then null else new.completed_at > new.deadline end,
     new.snooze_count)
  on conflict (task_id) do update set
    category          = excluded.category,
    estimated_minutes = excluded.estimated_minutes,
    actual_minutes    = excluded.actual_minutes,
    deadline          = excluded.deadline,
    completed_at      = excluded.completed_at,
    was_late          = excluded.was_late,
    snooze_count      = excluded.snooze_count;
  return new;
end $$;

create trigger tasks_sync_log after insert or update on public.tasks
  for each row when (new.status = 'done') execute function public.sync_task_log();

-- 10g. Rencana: nomor versi otomatis per pengguna
create or replace function public.schedule_plans_set_version()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.version is null then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 3));
    select coalesce(max(version), 0) + 1 into new.version
      from public.schedule_plans where user_id = new.user_id;
  end if;
  return new;
end $$;

create trigger schedule_plans_set_version before insert on public.schedule_plans
  for each row execute function public.schedule_plans_set_version();

-- 10h. Guard di level database: blok kerja tidak boleh menyentuh jam tidur / jadwal tetap
--      (kecuali blok yang disematkan pengguna). Cadangan bila validator di Edge Function lolos.
create or replace function public.scheduled_blocks_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.task_title is null and new.task_id is not null then
    select title into new.task_title from public.tasks where id = new.task_id;
  end if;

  if new.kind = 'work' and not new.is_locked then
    if public.block_violates_sleep(new.user_id, new.start_at, new.end_at) then
      raise exception 'Sleep-Guard: blok kerja menyentuh jam tidur' using errcode = '23514';
    end if;
    if public.block_hits_fixed(new.user_id, new.start_at, new.end_at) then
      raise exception 'Blok kerja bentrok dengan jadwal tetap' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger scheduled_blocks_guard before insert or update on public.scheduled_blocks
  for each row execute function public.scheduled_blocks_guard();

-- ---------------------------------------------------------------------------
-- 11. VIEW (security_invoker: RLS pengguna tetap berlaku)
-- ---------------------------------------------------------------------------
create view public.v_active_blocks with (security_invoker = true) as
select b.*, p.version as plan_version
from public.scheduled_blocks b
join public.schedule_plans p on p.id = b.plan_id and p.status = 'active';

-- Rasio durasi aktual/estimasi per kategori (bahan Duration Estimator).
create view public.v_duration_stats with (security_invoker = true) as
select user_id, category,
       count(*)                                                    as sample_size,
       round(avg(actual_minutes::numeric / estimated_minutes), 3)  as avg_ratio,
       round(stddev_samp(actual_minutes::numeric / estimated_minutes), 3) as stddev_ratio
from public.task_logs
where actual_minutes is not null and estimated_minutes > 0
group by user_id, category;

-- ---------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY & GRANTS
-- ---------------------------------------------------------------------------
alter table public.profiles                   enable row level security;
alter table public.persona_presets            enable row level security;
alter table public.user_preferences           enable row level security;
alter table public.weight_calibrations        enable row level security;
alter table public.fixed_schedules            enable row level security;
alter table public.fixed_schedule_exceptions  enable row level security;
alter table public.chat_conversations         enable row level security;
alter table public.chat_messages              enable row level security;
alter table public.tasks                      enable row level security;
alter table public.task_events                enable row level security;
alter table public.task_logs                  enable row level security;
alter table public.schedule_plans             enable row level security;
alter table public.scheduled_blocks           enable row level security;
alter table public.reschedule_runs            enable row level security;
alter table public.reschedule_changes         enable row level security;
alter table public.chat_actions               enable row level security;
alter table public.ai_usage                   enable row level security;

-- Data sistem
create policy persona_presets_read on public.persona_presets
  for select to authenticated using (true);

-- Profil & preferensi
create policy profiles_select on public.profiles for select to authenticated using (user_id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy prefs_select on public.user_preferences for select to authenticated using (user_id = auth.uid());
create policy prefs_update on public.user_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Hanya baca (ditulis trigger / service role)
create policy weight_calibrations_select on public.weight_calibrations
  for select to authenticated using (user_id = auth.uid());
create policy task_events_select on public.task_events
  for select to authenticated using (user_id = auth.uid());
create policy task_logs_select on public.task_logs
  for select to authenticated using (user_id = auth.uid());
create policy ai_usage_select on public.ai_usage
  for select to authenticated using (user_id = auth.uid());

-- CRUD penuh milik sendiri
create policy fixed_schedules_owner on public.fixed_schedules
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fixed_schedule_exceptions_owner on public.fixed_schedule_exceptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chat_conversations_owner on public.chat_conversations
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chat_messages_owner on public.chat_messages
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chat_actions_owner on public.chat_actions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tasks_owner_all on public.tasks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy scheduled_blocks_owner on public.scheduled_blocks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Rencana & run: klien hanya boleh membuat usulan ('proposed'). Aktivasi/penolakan lewat RPC.
create policy schedule_plans_select on public.schedule_plans
  for select to authenticated using (user_id = auth.uid());
create policy schedule_plans_insert on public.schedule_plans
  for insert to authenticated with check (user_id = auth.uid() and status = 'proposed');
create policy schedule_plans_delete on public.schedule_plans
  for delete to authenticated using (user_id = auth.uid() and status in ('proposed', 'rejected'));

create policy reschedule_runs_select on public.reschedule_runs
  for select to authenticated using (user_id = auth.uid());
create policy reschedule_runs_insert on public.reschedule_runs
  for insert to authenticated with check (user_id = auth.uid() and status = 'proposed');

create policy reschedule_changes_select on public.reschedule_changes
  for select to authenticated using (user_id = auth.uid());
create policy reschedule_changes_insert on public.reschedule_changes
  for insert to authenticated with check (user_id = auth.uid());

-- Hak eksekusi fungsi
revoke execute on function public.apply_reschedule(uuid)   from public, anon;
revoke execute on function public.reject_reschedule(uuid)  from public, anon;
grant  execute on function public.apply_reschedule(uuid)   to authenticated;
grant  execute on function public.reject_reschedule(uuid)  to authenticated;

revoke execute on function public.consume_ai_quota(uuid, text, int) from public, anon, authenticated;
grant  execute on function public.consume_ai_quota(uuid, text, int) to service_role;

-- ---------------------------------------------------------------------------
-- 13. SEED PERSONA
-- ---------------------------------------------------------------------------
insert into public.persona_presets
  (key, name, description, w_urgency, w_importance, w_consequence, w_duration, w_availability, sort_order)
values
  ('balanced',       'Seimbang',        'Bobot awal dari penelitian; cocok sebagai titik mulai.',          0.300, 0.250, 0.200, 0.100, 0.150, 1),
  ('deadline_driven','Deadline Driver', 'Tenggat terdekat selalu didahulukan.',                            0.450, 0.150, 0.200, 0.050, 0.150, 2),
  ('goal_oriented',  'Goal-Oriented',   'Tugas paling berpengaruh pada tujuan didahulukan.',               0.200, 0.400, 0.200, 0.050, 0.150, 3),
  ('risk_averse',    'Anti Telat',      'Konsekuensi keterlambatan (nilai/sanksi) paling diutamakan.',     0.300, 0.150, 0.350, 0.050, 0.150, 4),
  ('quick_wins',     'Quick Wins',      'Tugas singkat diselesaikan dulu untuk menjaga momentum.',         0.250, 0.200, 0.150, 0.300, 0.100, 5)
on conflict (key) do nothing;
