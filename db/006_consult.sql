-- Sthamly: consultation booking (v1)
-- Run after 001 to 005. Safe to re-run where possible.
-- Times: timestamptz (UTC). Local rules are in Asia/Kolkata.
-- Money: paise (integer).

-- ---------- Weekly availability rules ----------
-- The practitioner sets a weekly pattern. Slots are generated from it (see generate_practitioner_slots).
create table if not exists availability_rules (
  id              uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  weekday         smallint not null check (weekday between 0 and 6),   -- 0 = Sunday, IST
  start_time      time not null,                                        -- IST local time
  end_time        time not null,                                        -- IST local time
  active          boolean not null default true,
  check (end_time > start_time)
);
create index if not exists availability_rules_practitioner on availability_rules (practitioner_id, active);

alter table availability_rules enable row level security;

create policy "practitioner manages own rules" on availability_rules
  for all using (auth.uid() = practitioner_id)
  with check (auth.uid() = practitioner_id);

-- ---------- Extra consultation fields ----------
alter table consultations add column if not exists refund_paise int not null default 0 check (refund_paise >= 0);
alter table consultations add column if not exists cancel_reason text;
alter table consultations add column if not exists payment_id text;

create index if not exists consultations_held_until
  on consultations (held_until) where status = 'pending_payment';

-- ---------- Generate 30-minute slots from the weekly rules ----------
-- Creates slots for the next p_days days, starting at least 1 hour from now.
-- Existing slots are not changed (conflicts are ignored).
create or replace function generate_practitioner_slots(p_practitioner uuid, p_days int default 30)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int;
begin
  with days as (
    select g.d::date as local_day
    from generate_series(
      (now() at time zone 'Asia/Kolkata')::date,
      (now() at time zone 'Asia/Kolkata')::date + (p_days - 1),
      interval '1 day'
    ) as g(d)
  ),
  candidate as (
    select
      ((days.local_day + r.start_time) + (s * interval '30 minutes')) at time zone 'Asia/Kolkata' as starts_at
    from days
    join availability_rules r
      on r.practitioner_id = p_practitioner
     and r.active
     and r.weekday = extract(dow from days.local_day)::int
    cross join generate_series(0, 47) as s
    where ((days.local_day + r.start_time) + (s * interval '30 minutes')) + interval '30 minutes'
          <= (days.local_day + r.end_time)
  )
  insert into availability_slots (practitioner_id, starts_at, ends_at)
  select p_practitioner, c.starts_at, c.starts_at + interval '30 minutes'
  from candidate c
  where c.starts_at > now() + interval '1 hour'
  on conflict (practitioner_id, starts_at) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- ---------- Atomic hold: reserve a slot before payment ----------
-- The slot row is locked, the unique index blocks a second active booking,
-- and the hold lasts 10 minutes. Fee split: practitioner 70%, Sthamly 30%.
create or replace function hold_consultation(p_user uuid, p_slot uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot availability_slots%rowtype;
  v_pract practitioners%rowtype;
  v_amount int;
  v_payout int;
  v_fee int;
  v_id uuid;
begin
  select * into v_slot from availability_slots where id = p_slot for update;
  if not found or v_slot.blocked then
    raise exception 'slot_unavailable';
  end if;

  if v_slot.starts_at < now() + interval '30 minutes' then
    raise exception 'slot_too_soon';
  end if;

  select * into v_pract from practitioners where id = v_slot.practitioner_id;
  if not found or not v_pract.verified or not v_pract.is_listed then
    raise exception 'practitioner_unavailable';
  end if;

  if v_pract.id = p_user then
    raise exception 'self_booking';
  end if;

  v_amount := v_pract.consult_fee_paise;
  v_payout := round(v_amount * 0.70)::int;
  v_fee := v_amount - v_payout;

  begin
    insert into consultations (
      user_id, practitioner_id, slot_id, status,
      amount_paise, platform_fee_paise, payout_paise, held_until
    )
    values (
      p_user, v_pract.id, p_slot, 'pending_payment',
      v_amount, v_fee, v_payout, now() + interval '10 minutes'
    )
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'slot_taken';
  end;

  return v_id;
end;
$$;

-- ---------- Confirm after a verified payment webhook ----------
-- Only moves a pending hold to confirmed. Returns false if the hold already expired or was confirmed.
create or replace function confirm_consultation(p_consult uuid, p_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update consultations
     set status = 'confirmed',
         held_until = null,
         payment_id = p_payment_id
   where id = p_consult
     and status = 'pending_payment'
     and held_until > now();

  get diagnostics n = row_count;
  return n = 1;
end;
$$;

-- ---------- Expire unpaid holds (run every minute) ----------
create or replace function expire_consult_holds()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update consultations
     set status = 'expired'
   where status = 'pending_payment'
     and held_until < now();

  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------- Refund rule for cancellations (from docs/04 §7, pending lawyer review) ----------
-- by = 'user' : >24h 100%, 6 to 24h 50%, <6h 0%
-- by = 'practitioner' or 'system' : 100%
create or replace function refund_for_cancellation(p_consult uuid, p_by text)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c consultations%rowtype;
  s availability_slots%rowtype;
  hours_before numeric;
begin
  select * into c from consultations where id = p_consult;
  if not found then
    raise exception 'consultation_not_found';
  end if;

  select * into s from availability_slots where id = c.slot_id;

  if p_by <> 'user' then
    return c.amount_paise;
  end if;

  hours_before := extract(epoch from (s.starts_at - now())) / 3600;

  if hours_before > 24 then
    return c.amount_paise;
  elsif hours_before >= 6 then
    return round(c.amount_paise * 0.50)::int;
  else
    return 0;
  end if;
end;
$$;

-- ---------- Permissions ----------
-- Booking functions are called by server code with the service role only.
revoke execute on function generate_practitioner_slots(uuid, int) from public, anon, authenticated;
revoke execute on function hold_consultation(uuid, uuid) from public, anon, authenticated;
revoke execute on function confirm_consultation(uuid, text) from public, anon, authenticated;
revoke execute on function expire_consult_holds() from public, anon, authenticated;
revoke execute on function refund_for_cancellation(uuid, text) from public, anon, authenticated;

grant execute on function generate_practitioner_slots(uuid, int) to service_role;
grant execute on function hold_consultation(uuid, uuid) to service_role;
grant execute on function confirm_consultation(uuid, text) to service_role;
grant execute on function expire_consult_holds() to service_role;
grant execute on function refund_for_cancellation(uuid, text) to service_role;

-- ---------- Schedule the hold expiry (every minute) ----------
-- If pg_cron is not available on your plan, skip this block and run
-- select expire_consult_holds(); from a scheduled route instead (api/cron/expire-holds).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'expire-consult-holds',
    '* * * * *',
    $cron$ select expire_consult_holds(); $cron$
  );
exception
  when others then
    raise notice 'pg_cron not scheduled: %', sqlerrm;
end
$$;

-- ---------- Checks to run after applying ----------
-- 1. insert into availability_rules (practitioner_id, weekday, start_time, end_time)
--    values ('<verified practitioner uuid>', 1, '18:00', '20:00');   -- Monday 6 to 8 pm IST
-- 2. select generate_practitioner_slots('<practitioner uuid>', 30);   -- expect 4 slots per week in the next 30 days
-- 3. select hold_consultation('<user uuid>', '<slot uuid>');          -- returns a consultation id
-- 4. select hold_consultation('<other user>', '<same slot>');         -- error: slot_taken
-- 5. select refund_for_cancellation('<consult id>', 'user');         -- full/half/zero by notice time