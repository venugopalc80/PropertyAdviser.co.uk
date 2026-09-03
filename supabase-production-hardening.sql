-- Havenly production hardening review
-- Apply AFTER supabase-schema.sql and supabase-security-patch.sql.
-- This migration tightens role boundaries and prevents unauthenticated/spoofed buyer activity.

create or replace function public.is_agent_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('agent','admin')
  );
$$;

revoke all on function public.is_agent_or_admin() from public;
grant execute on function public.is_agent_or_admin() to authenticated;

-- Only agent/admin accounts may create or manage property listings.
drop policy if exists properties_agent_insert on public.properties;
create policy properties_agent_insert on public.properties
for insert to authenticated
with check (public.is_agent_or_admin() and auth.uid() = agent_id);

drop policy if exists properties_agent_update on public.properties;
create policy properties_agent_update on public.properties
for update to authenticated
using (public.is_agent_or_admin() and auth.uid() = agent_id)
with check (public.is_agent_or_admin() and auth.uid() = agent_id);

drop policy if exists properties_agent_delete on public.properties;
create policy properties_agent_delete on public.properties
for delete to authenticated
using (public.is_agent_or_admin() and auth.uid() = agent_id);

-- Buyer enquiries must be authenticated and bound to the authenticated account.
drop policy if exists enquiries_buyer_insert on public.enquiries;
create policy enquiries_buyer_insert on public.enquiries
for insert to authenticated
with check (
  auth.uid() = buyer_id
  and exists (select 1 from public.properties p where p.id = property_id and p.status = 'published')
);

-- Buyers may update/delete only their own enquiry if the workflow needs it; agents can update their property enquiries.
drop policy if exists enquiries_buyer_update on public.enquiries;
create policy enquiries_buyer_update on public.enquiries
for update to authenticated
using (auth.uid() = buyer_id)
with check (auth.uid() = buyer_id);

drop policy if exists enquiries_buyer_delete on public.enquiries;
create policy enquiries_buyer_delete on public.enquiries
for delete to authenticated
using (auth.uid() = buyer_id);

-- Viewing requests must be authenticated and bound to the authenticated account.
drop policy if exists viewing_buyer_insert on public.viewing_requests;
create policy viewing_buyer_insert on public.viewing_requests
for insert to authenticated
with check (
  auth.uid() = buyer_id
  and exists (select 1 from public.properties p where p.id = property_id and p.status = 'published')
);

drop policy if exists viewing_buyer_update on public.viewing_requests;
create policy viewing_buyer_update on public.viewing_requests
for update to authenticated
using (auth.uid() = buyer_id)
with check (auth.uid() = buyer_id);

drop policy if exists viewing_buyer_delete on public.viewing_requests;
create policy viewing_buyer_delete on public.viewing_requests
for delete to authenticated
using (auth.uid() = buyer_id);

-- Keep buyer contact fields aligned with their account when available; database is the authority for ownership.
-- Do not expose profiles broadly: the existing own-profile policy remains intentionally narrow.

-- Property data quality guards.
alter table public.properties drop constraint if exists properties_price_check;
alter table public.properties add constraint properties_price_check check (price >= 0);
alter table public.properties drop constraint if exists properties_bedrooms_check;
alter table public.properties add constraint properties_bedrooms_check check (bedrooms between 0 and 100);
alter table public.properties drop constraint if exists properties_bathrooms_check;
alter table public.properties add constraint properties_bathrooms_check check (bathrooms between 0 and 100);
alter table public.properties drop constraint if exists properties_area_check;
alter table public.properties add constraint properties_area_check check (floor_area_sqft is null or floor_area_sqft > 0);

-- Never allow a record marked published without the core confirmations expected by the marketplace workflow.
create or replace function public.validate_published_property()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'published' then
    if not new.facts_confirmed then
      raise exception 'Property facts must be confirmed before publication';
    end if;
    if new.title is null or btrim(new.title) = '' or new.location is null or btrim(new.location) = '' then
      raise exception 'Title and location are required before publication';
    end if;
    if new.price is null or new.price < 0 then
      raise exception 'A valid price is required before publication';
    end if;
    if new.published_at is null then
      new.published_at = now();
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists validate_published_property_trigger on public.properties;
create trigger validate_published_property_trigger
before insert or update on public.properties
for each row execute function public.validate_published_property();

-- Standard updated_at maintenance for mutable customer records.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_enquiries_updated_at on public.enquiries;
create trigger touch_enquiries_updated_at before update on public.enquiries for each row execute function public.touch_updated_at();
drop trigger if exists touch_viewings_updated_at on public.viewing_requests;
create trigger touch_viewings_updated_at before update on public.viewing_requests for each row execute function public.touch_updated_at();

-- Recommended production controls outside SQL:
-- * Enable leaked-password protection/MFA as appropriate in Supabase Auth.
-- * Keep service-role keys server-side only; never place them in Vercel/browser code.
-- * Restrict production storage buckets and use signed URLs where appropriate.
-- * Configure backups, monitoring, rate limits and incident response.
-- * Review retention/deletion procedures and data-processing agreements before launch.
