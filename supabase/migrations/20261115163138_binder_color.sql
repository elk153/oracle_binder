-- D-056: each binder has a cover color. The app offers a fixed palette, but
-- the column accepts any lowercase #rrggbb value so a custom picker can be
-- added later without another migration.
--
-- The default is the first palette color. It fills existing binders, and it
-- also keeps an older app version working: inserts without a color still
-- succeed during the rollout.
alter table public.binders
  add column color text not null default '#1f2a6b',
  add constraint binders_color_hex_check
    check (color ~ '^#[0-9a-f]{6}$');

-- Updates on binders are granted column by column (only `name` so far), so
-- the Modify dialog needs an explicit grant for the new column.
grant update (color) on table public.binders to authenticated;
