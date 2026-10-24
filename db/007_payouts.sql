-- Sthamly payouts settlement (v1)
-- Run after 006_consult.sql.
-- Money in paise. A consultation's payout is fixed at booking (70% of the fee).
-- Settlement groups finished sessions per practitioner into one payouts row.

alter table payouts
  add column if not exists consult_count int not null default 0,
  add column if not exists reference text,
  add column if not exists sent_at timestamptz;

alter table consultations
  add column if not exists payout_id uuid references payouts(id),
  add column if not exists settled_at timestamptz;

create index if not exists consultations_unsettled
  on consultations (status) where payout_id is null;

-- Settles finished sessions whose IST date is in [p_start, p_end).
-- Returns the number of consultations settled.
create or replace function settle_payouts(p_start date, p_end date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  pr record;
  settled int := 0;
  n int;
begin
  for pr in
    select distinct c.practitioner_id
      from consultations c
      join availability_slots s on s.id = c.slot_id
     where c.status in ('completed', 'no_show')
       and c.payout_id is null
       and (s.starts_at at time zone 'Asia/Kolkata')::date >= p_start
       and (s.starts_at at time zone 'Asia/Kolkata')::date <  p_end
  loop
    with picked as (
      select c.id,
             greatest(c.payout_paise - c.refund_paise, 0) as amt
        from consultations c
        join availability_slots s on s.id = c.slot_id
       where c.practitioner_id = pr.practitioner_id
         and c.status in ('completed', 'no_show')
         and c.payout_id is null
         and (s.starts_at at time zone 'Asia/Kolkata')::date >= p_start
         and (s.starts_at at time zone 'Asia/Kolkata')::date <  p_end
       for update of c
    ),
    ins as (
      insert into payouts (practitioner_id, period_start, period_end, amount_paise, consult_count)
      select pr.practitioner_id, p_start, p_end, coalesce(sum(amt), 0), count(*)
        from picked
      having count(*) > 0
      returning id
    )
    update consultations c
       set payout_id = ins.id,
           settled_at = now()
      from picked, ins
     where c.id = picked.id;

    get diagnostics n = row_count;
    settled := settled + n;
  end loop;

  return settled;
end $$;

-- Only the server (service role) may run settlement.
revoke execute on function settle_payouts(date, date) from public, anon, authenticated;
grant execute on function settle_payouts(date, date) to service_role;