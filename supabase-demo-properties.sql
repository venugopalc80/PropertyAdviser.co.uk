-- Havenly demo property seed
-- Run after supabase-schema.sql and supabase-security-patch.sql.
-- These six records make the existing demo listings real Supabase rows.
-- agent_id is nullable for demo catalogue records; production listings should always belong to an authenticated agent.

alter table public.properties alter column agent_id drop not null;
alter table public.properties add column if not exists demo_key integer;
create unique index if not exists properties_demo_key_uidx on public.properties(demo_key) where demo_key is not null;

insert into public.properties
  (id, demo_key, agent_id, title, location, price, bedrooms, bathrooms, floor_area_sqft, property_type, tenure, epc_rating, parking, description, status, material_info_confirmed, facts_confirmed, published_at)
values
  ('10000000-0000-4000-8000-000000000001',1,null,'3 bedroom semi-detached house','Bristol, BS7',475000,3,2,1245,'Semi-detached','Freehold','B','Driveway','Havenly illustrative demo listing.', 'published', true, true, now()),
  ('10000000-0000-4000-8000-000000000002',2,null,'2 bedroom apartment','London, SE1',625000,2,2,885,'Apartment','Leasehold','C','Permit','Havenly illustrative demo listing.', 'published', true, true, now()),
  ('10000000-0000-4000-8000-000000000003',3,null,'4 bedroom detached house','Leeds, LS16',385000,4,2,1890,'Detached','Freehold','C','Garage + drive','Havenly illustrative demo listing.', 'published', true, true, now()),
  ('10000000-0000-4000-8000-000000000004',4,'10000000-0000-4000-8000-000000000004','3 bedroom townhouse','Manchester, M20',510000,3,2,1430,'Townhouse','Freehold','B','Allocated','Havenly illustrative demo listing.', 'published', true, true, now()),
  ('10000000-0000-4000-8000-000000000005',5,null,'4 bedroom period home','Bath, BA1',795000,4,3,2240,'Period house','Freehold','D','On-street','Havenly illustrative demo listing.', 'published', true, true, now()),
  ('10000000-0000-4000-8000-000000000006',6,null,'2 bedroom cottage','York, YO31',295000,2,1,925,'Cottage','Freehold','C','Driveway','Havenly illustrative demo listing.', 'published', true, true, now())
on conflict (id) do update set
  demo_key=excluded.demo_key,
  title=excluded.title,
  location=excluded.location,
  price=excluded.price,
  bedrooms=excluded.bedrooms,
  bathrooms=excluded.bathrooms,
  floor_area_sqft=excluded.floor_area_sqft,
  property_type=excluded.property_type,
  tenure=excluded.tenure,
  epc_rating=excluded.epc_rating,
  parking=excluded.parking,
  description=excluded.description,
  status='published',
  material_info_confirmed=true,
  facts_confirmed=true,
  published_at=coalesce(public.properties.published_at, now()),
  updated_at=now();
