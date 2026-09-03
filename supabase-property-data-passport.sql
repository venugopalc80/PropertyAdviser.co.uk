-- Havenly Property Data Passport
-- Applied to Supabase as property_data_passport_v1.
create table if not exists public.property_data_passport (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  field_key text not null,
  field_label text not null,
  value_text text,
  status text not null default 'needs_review' check (status in ('confirmed','agent_stated','needs_review','not_applicable','not_provided')),
  source_name text,
  source_url text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, field_key)
);
create index if not exists property_data_passport_property_idx on public.property_data_passport(property_id);
alter table public.property_data_passport enable row level security;
revoke all on public.property_data_passport from anon;
grant select on public.property_data_passport to anon, authenticated;
grant insert, update, delete on public.property_data_passport to authenticated;
drop policy if exists "passport_public_published_read" on public.property_data_passport;
create policy "passport_public_published_read" on public.property_data_passport for select to anon, authenticated using (exists (select 1 from public.properties p where p.id = property_id and p.status = 'published'));
drop policy if exists "passport_agent_write" on public.property_data_passport;
create policy "passport_agent_write" on public.property_data_passport for all to authenticated using (exists (select 1 from public.properties p where p.id = property_id and (p.agent_id = (select auth.uid()) or public.is_agent_or_admin()))) with check (exists (select 1 from public.properties p where p.id = property_id and (p.agent_id = (select auth.uid()) or public.is_agent_or_admin())));
create or replace function public.touch_property_data_passport_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists property_data_passport_touch on public.property_data_passport;
create trigger property_data_passport_touch before update on public.property_data_passport for each row execute function public.touch_property_data_passport_updated_at();