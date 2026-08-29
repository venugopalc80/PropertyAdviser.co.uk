-- Havenly / PropertyAdviser UK
-- Run in Supabase SQL Editor. Review business/legal requirements before production.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'buyer' check (role in ('buyer','agent','admin')),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete restrict,
  agency_id uuid references public.agencies(id) on delete set null,
  title text not null,
  location text not null,
  price numeric(14,2) not null check (price >= 0),
  bedrooms integer not null default 0 check (bedrooms >= 0),
  bathrooms integer not null default 0 check (bathrooms >= 0),
  floor_area_sqft numeric(10,2),
  property_type text not null,
  tenure text,
  epc_rating text check (epc_rating is null or epc_rating in ('A','B','C','D','E','F','G')),
  parking text,
  description text,
  status text not null default 'draft' check (status in ('draft','pending_review','published','unpublished','archived')),
  material_info_confirmed boolean not null default false,
  facts_confirmed boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_properties (
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table if not exists public.comparisons (
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  buyer_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  phone text,
  message text not null,
  interest text,
  status text not null default 'new' check (status in ('new','read','responded','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.viewing_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  buyer_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  phone text,
  requested_date date,
  requested_time text,
  message text,
  status text not null default 'requested' check (status in ('requested','confirmed','declined','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists properties_agent_id_idx on public.properties(agent_id);
create index if not exists properties_status_idx on public.properties(status);
create index if not exists enquiries_property_id_idx on public.enquiries(property_id);
create index if not exists enquiries_buyer_id_idx on public.enquiries(buyer_id);
create index if not exists viewing_requests_property_id_idx on public.viewing_requests(property_id);
create index if not exists viewing_requests_buyer_id_idx on public.viewing_requests(buyer_id);

alter table public.profiles enable row level security;
alter table public.agencies enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.saved_properties enable row level security;
alter table public.comparisons enable row level security;
alter table public.enquiries enable row level security;
alter table public.viewing_requests enable row level security;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name','')) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Profiles: users can read/update their own profile.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Published properties are public; agents manage their own listings.
drop policy if exists properties_public_read on public.properties;
create policy properties_public_read on public.properties for select using (status = 'published' or auth.uid() = agent_id);
drop policy if exists properties_agent_insert on public.properties;
create policy properties_agent_insert on public.properties for insert with check (auth.uid() = agent_id);
drop policy if exists properties_agent_update on public.properties;
create policy properties_agent_update on public.properties for update using (auth.uid() = agent_id) with check (auth.uid() = agent_id);
drop policy if exists properties_agent_delete on public.properties;
create policy properties_agent_delete on public.properties for delete using (auth.uid() = agent_id);

-- Images follow property visibility/ownership.
drop policy if exists property_images_read on public.property_images;
create policy property_images_read on public.property_images for select using (exists (select 1 from public.properties p where p.id = property_id and (p.status = 'published' or p.agent_id = auth.uid())));
drop policy if exists property_images_agent_write on public.property_images;
create policy property_images_agent_write on public.property_images for all using (exists (select 1 from public.properties p where p.id = property_id and p.agent_id = auth.uid())) with check (exists (select 1 from public.properties p where p.id = property_id and p.agent_id = auth.uid()));

-- Private user collections.
drop policy if exists saved_own on public.saved_properties;
create policy saved_own on public.saved_properties for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists comparisons_own on public.comparisons;
create policy comparisons_own on public.comparisons for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Buyers create their own enquiries; agents can read/update enquiries for their properties.
drop policy if exists enquiries_buyer_insert on public.enquiries;
create policy enquiries_buyer_insert on public.enquiries for insert with check (buyer_id is null or auth.uid() = buyer_id);
drop policy if exists enquiries_participant_read on public.enquiries;
create policy enquiries_participant_read on public.enquiries for select using (auth.uid() = buyer_id or exists (select 1 from public.properties p where p.id = property_id and p.agent_id = auth.uid()));
drop policy if exists enquiries_agent_update on public.enquiries;
create policy enquiries_agent_update on public.enquiries for update using (exists (select 1 from public.properties p where p.id = property_id and p.agent_id = auth.uid())) with check (exists (select 1 from public.properties p where p.id = property_id and p.agent_id = auth.uid()));

-- Viewing requests use the same buyer/agent boundary.
drop policy if exists viewing_buyer_insert on public.viewing_requests;
create policy viewing_buyer_insert on public.viewing_requests for insert with check (buyer_id is null or auth.uid() = buyer_id);
drop policy if exists viewing_participant_read on public.viewing_requests;
create policy viewing_participant_read on public.viewing_requests for select using (auth.uid() = buyer_id or exists (select 1 from public.properties p where p.id = property_id and p.agent_id = auth.uid()));
drop policy if exists viewing_agent_update on public.viewing_requests;
create policy viewing_agent_update on public.viewing_requests for update using (exists (select 1 from public.properties p where p.id = property_id and p.agent_id = auth.uid())) with check (exists (select 1 from public.properties p where p.id = property_id and p.agent_id = auth.uid()));

-- Agencies: creator can manage; membership model can be expanded for production.
drop policy if exists agencies_read on public.agencies;
create policy agencies_read on public.agencies for select using (created_by = auth.uid());
drop policy if exists agencies_insert on public.agencies;
create policy agencies_insert on public.agencies for insert with check (created_by = auth.uid());
drop policy if exists agencies_update on public.agencies;
create policy agencies_update on public.agencies for update using (created_by = auth.uid()) with check (created_by = auth.uid());

-- Storage bucket setup is intentionally omitted: create a private property-images bucket and policies after deciding your document/image retention model.
