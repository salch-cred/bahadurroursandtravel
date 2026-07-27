create extension if not exists pgcrypto;
create table if not exists bookings(id uuid primary key default gen_random_uuid(),booking_id text unique not null,name text not null,phone text not null,email text not null,trip text not null,travel_date date,guests integer,city text,note text,status text not null default 'New request',amount numeric(12,2),created_at timestamptz not null default now());
create table if not exists packages(id uuid primary key default gen_random_uuid(),name text not null,slug text unique not null,region text,category text,duration text,price text,summary text,description text,image_url text,latitude numeric,longitude numeric,highlights jsonb not null default '[]',itinerary jsonb not null default '[]',included jsonb not null default '[]',active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists reviews(id uuid primary key default gen_random_uuid(),name text not null,trip text not null,rating integer not null check(rating between 1 and 5),booking_ref text not null,package_slug text,text text not null,media_url text,media_type text,consent boolean not null default false,status text not null default 'pending',created_at timestamptz not null default now());
create table if not exists media(id uuid primary key default gen_random_uuid(),type text not null check(type in ('photo','video')),guest_name text not null,trip text not null,caption text,status text not null default 'pending',consent boolean not null default false,url text not null,mime_type text,created_at timestamptz not null default now());
create table if not exists invoices(id uuid primary key default gen_random_uuid(),invoice_number text unique not null,invoice_date date,due_date date,booking_ref text,customer_name text not null,customer_address text,phone text,email text,items jsonb not null default '[]',tax_label text,tax_rate numeric(6,2),discount numeric(12,2),subtotal numeric(12,2),tax numeric(12,2),total numeric(12,2),status text not null default 'Draft',notes text,payment_details text,created_at timestamptz not null default now());
create index if not exists bookings_created_idx on bookings(created_at desc);create index if not exists packages_slug_idx on packages(slug);create index if not exists reviews_status_idx on reviews(status,created_at desc);

-- v5 billing, package and traffic migration
alter table packages add column if not exists package_type text not null default 'domestic';
alter table packages add column if not exists flight_details jsonb not null default '{}'::jsonb;
alter table packages add column if not exists room_details jsonb not null default '{}'::jsonb;
alter table packages add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table packages add column if not exists excluded jsonb not null default '[]'::jsonb;
alter table packages add column if not exists terms text;
alter table invoices add column if not exists travel_details jsonb not null default '{}'::jsonb;
create table if not exists page_views(id bigserial primary key,visitor_hash text not null,path text not null,referrer text,user_agent text,created_at timestamptz not null default now());
create index if not exists page_views_created_idx on page_views(created_at desc);
create index if not exists page_views_visitor_idx on page_views(visitor_hash,created_at desc);
