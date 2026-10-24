-- Sthamly: practitioner documents (v1)
-- Run after 001 to 004. Safe to re-run.

alter table practitioners add column if not exists degree_doc_path text;
alter table practitioners add column if not exists registration_doc_path text;

-- Private bucket. Only the service role (server code) reads or writes it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'practitioner-docs',
  'practitioner-docs',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- No storage policies are added for anon or authenticated roles.
-- Users cannot list, read or upload directly. All access goes through server routes.