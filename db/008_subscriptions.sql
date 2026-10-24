-- Sthamly subscriptions (v1)
-- Run after 007_payouts.sql.

create index if not exists subscriptions_user_status
  on subscriptions (user_id, status);