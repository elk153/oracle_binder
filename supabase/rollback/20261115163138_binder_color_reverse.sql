-- Reverses 20261115163138_binder_color.sql. Dropping the column also drops its
-- check constraint and its column privilege. Chosen cover colors are lost.
alter table public.binders drop column if exists color;
