-- StudyBuddy initial schema
-- Creates all core tables per the approved M1 database design.
-- No destructive statements; safe to run against an empty database.

create extension if not exists pgcrypto;

-- profiles: 1:1 extension of auth.users with academic/display data.
-- Rows are created explicitly by the completeProfile Server Action after
-- onboarding, not by an auth trigger — so required fields are NOT NULL.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  institution text not null,
  faculty text not null,
  degree text not null,
  study_year int not null,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Academic profile data, 1:1 with auth.users.';

-- courses: reference table of institution courses, avoids free-text
-- duplication and enables exact-match search/recommendation queries.
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text not null,
  course_name text not null,
  faculty text not null,
  constraint courses_course_code_key unique (course_code)
);

comment on table public.courses is 'Reference list of courses; read-only from the app.';

-- profile_courses: many-to-many join between profiles and the courses
-- they study.
create table public.profile_courses (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  primary key (profile_id, course_id)
);

comment on table public.profile_courses is 'Which courses each profile is studying.';

-- groups: a study group (ongoing) or a task/project group, tied to a course.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  group_type text not null check (group_type in ('study', 'project')),
  course_id uuid not null references public.courses (id) on delete restrict,
  target_year int,
  max_members int not null check (max_members > 1),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.groups is 'Study or task/project groups, each tied to one course.';

-- group_members: approved membership only. Rows are created solely via the
-- approveJoinRequest Server Action (or group creation), never inserted
-- directly by a joining user.
create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

comment on table public.group_members is 'Approved group membership, with a group-local owner/member role.';

-- join_requests: mediates the request -> approve/reject workflow before a
-- group_members row is created.
create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

comment on table public.join_requests is 'Pending/approved/rejected requests to join a group.';

-- materials: metadata only. The file itself lives in Supabase Storage at
-- storage_path.
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  category text not null check (category in ('summary', 'exercise', 'past_exam', 'other')),
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now()
);

comment on table public.materials is 'Study material metadata; file itself lives in Supabase Storage.';

-- chat_messages: group chat. group_id is the chat room; no separate rooms
-- table. No update/delete policies are defined later, so messages are
-- append-only by design.
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now()
);

comment on table public.chat_messages is 'Append-only group chat messages.';

-- meetings: study sessions; reminder_sent drives the Cron reminder job and
-- prevents duplicate emails.
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  meeting_time timestamptz not null,
  location_or_link text not null,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.meetings is 'Scheduled study sessions for a group.';

-- tasks: group task board. assignee_id is a single nullable profile, not a
-- many-to-many assignment table (per the approved M1 design).
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  assignee_id uuid references public.profiles (id) on delete set null,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  created_at timestamptz not null default now()
);

comment on table public.tasks is 'Group task board.';
