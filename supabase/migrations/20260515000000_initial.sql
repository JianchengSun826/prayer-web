-- ==========================================
-- TABLES
-- ==========================================

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  last_name  text not null,
  first_name text not null,
  gender     text not null check (gender in ('brother', 'sister')),
  role       text not null default 'user' check (role in ('user', 'admin')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id       serial primary key,
  name_zh  text not null,
  name_en  text not null,
  color    text not null default '#4a90d9'
);

create table public.prayer_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  category_id int not null references public.categories(id),
  content     text not null,
  status      text not null default 'active' check (status in ('active', 'expired', 'deleted')),
  expires_at  timestamptz not null default now() + interval '30 days',
  created_at  timestamptz not null default now()
);

create table public.email_notifications (
  id          uuid primary key default gen_random_uuid(),
  to_user_id  uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('expiry_reminder', 'new_admin_message')),
  payload     jsonb not null default '{}',
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table public.admin_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ==========================================
-- SEED: default categories
-- ==========================================

insert into public.categories (name_zh, name_en, color) values
  ('健康', 'Health',   '#4a90d9'),
  ('家庭', 'Family',   '#34a853'),
  ('工作', 'Work',     '#fbbc04'),
  ('教会', 'Church',   '#ea4335'),
  ('宣教', 'Mission',  '#9c27b0'),
  ('其他', 'Other',    '#9e9e9e');

-- ==========================================
-- RLS: Enable
-- ==========================================

alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.prayer_requests   enable row level security;
alter table public.email_notifications enable row level security;
alter table public.admin_messages    enable row level security;

-- ==========================================
-- RLS: profiles
-- ==========================================

create policy "profiles_select_all"
  on public.profiles for select using (true);

create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- ==========================================
-- RLS: categories (public read, admin write)
-- ==========================================

create policy "categories_select_all"
  on public.categories for select using (true);

create policy "categories_admin_all"
  on public.categories for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ==========================================
-- RLS: prayer_requests
-- ==========================================

create policy "prayers_select_active"
  on public.prayer_requests for select
  using (status = 'active');

create policy "prayers_select_admin"
  on public.prayer_requests for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "prayers_insert_own"
  on public.prayer_requests for insert
  with check (auth.uid() = user_id);

create policy "prayers_update_own"
  on public.prayer_requests for update
  using (auth.uid() = user_id and status = 'active');

create policy "prayers_update_admin"
  on public.prayer_requests for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ==========================================
-- RLS: admin_messages
-- ==========================================

create policy "messages_insert_own"
  on public.admin_messages for insert
  with check (auth.uid() = user_id);

create policy "messages_select_admin"
  on public.admin_messages for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "messages_update_admin"
  on public.admin_messages for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ==========================================
-- RLS: email_notifications (service role only)
-- ==========================================

-- No user-facing policies: only service role / Edge Function accesses this table

-- ==========================================
-- TRIGGER: auto-create profile on signup
-- ==========================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, last_name, first_name, gender)
  values (
    new.id,
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'gender'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
