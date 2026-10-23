-- Sthamly: create a profile row when a new auth user signs up.
-- Run after 001, 002. Safe to re-run.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: create profiles for any auth users that already exist.
insert into public.profiles (id, full_name, phone)
select u.id, u.raw_user_meta_data ->> 'full_name', u.phone
from auth.users u
on conflict (id) do nothing;