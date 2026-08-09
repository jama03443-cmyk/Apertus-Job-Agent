create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  target_role text,
  original_text text,
  optimized_text text,
  analysis jsonb not null default '{}'::jsonb,
  status text not null default 'analyzing' check (status in ('analyzing', 'complete', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resumes enable row level security;

drop policy if exists "Users can read their own resumes" on public.resumes;
create policy "Users can read their own resumes"
  on public.resumes for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own resumes" on public.resumes;
create policy "Users can create their own resumes"
  on public.resumes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own resumes" on public.resumes;
create policy "Users can update their own resumes"
  on public.resumes for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own resumes" on public.resumes;
create policy "Users can delete their own resumes"
  on public.resumes for delete to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload their own resume files" on storage.objects;
create policy "Users can upload their own resume files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can read their own resume files" on storage.objects;
create policy "Users can read their own resume files"
  on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own resume files" on storage.objects;
create policy "Users can delete their own resume files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
