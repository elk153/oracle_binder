-- D-079: delete, dispose and remove cards in Binder and Decks, in bulk.
-- Every function takes a list of ids and is all-or-nothing: if one id is
-- missing or belongs to another user, nothing changes.

create function public.delete_binder_copies(p_copy_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_requested integer;
  v_found integer;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'An authenticated user is required.';
  end if;

  if p_copy_ids is null
    or cardinality(p_copy_ids) = 0
    or array_position(p_copy_ids, null) is not null
  then
    raise exception using
      errcode = '22023',
      message = 'At least one copy id is required, and none may be empty.';
  end if;

  select count(distinct requested.id)
  into v_requested
  from unnest(p_copy_ids) as requested(id);

  select count(*)
  into v_found
  from (
    select copy.id
    from public.binder_cards as copy
    where copy.id = any(p_copy_ids)
      and copy.user_id = (select auth.uid())
    for update
  ) as locked;

  if v_found <> v_requested then
    raise exception using
      errcode = 'P0002',
      message = 'Binder copy not found or not owned by the current user.';
  end if;

  -- D-034: a deck entry that used this copy stays in its deck as virtual.
  update public.deck_cards
  set
    kind = 'virtual',
    binder_card_id = null
  where binder_card_id = any(p_copy_ids)
    and user_id = (select auth.uid());

  delete from public.binder_cards
  where id = any(p_copy_ids)
    and user_id = (select auth.uid());
end;
$function$;

create function public.dispose_binder_copies(
  p_copy_ids uuid[],
  p_disposal_status text
)
returns setof public.binder_cards
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_requested integer;
  v_found integer;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'An authenticated user is required.';
  end if;

  if p_disposal_status is null
    or p_disposal_status not in ('sold', 'lost', 'given_away')
  then
    raise exception using
      errcode = '22023',
      message = 'Invalid disposal status.';
  end if;

  if p_copy_ids is null
    or cardinality(p_copy_ids) = 0
    or array_position(p_copy_ids, null) is not null
  then
    raise exception using
      errcode = '22023',
      message = 'At least one copy id is required, and none may be empty.';
  end if;

  select count(distinct requested.id)
  into v_requested
  from unnest(p_copy_ids) as requested(id);

  select count(*)
  into v_found
  from (
    select copy.id
    from public.binder_cards as copy
    where copy.id = any(p_copy_ids)
      and copy.user_id = (select auth.uid())
    for update
  ) as locked;

  if v_found <> v_requested then
    raise exception using
      errcode = 'P0002',
      message = 'Binder copy not found or not owned by the current user.';
  end if;

  if exists (
    select 1
    from public.binder_cards as copy
    where copy.id = any(p_copy_ids)
      and copy.status <> 'owned'
  ) then
    raise exception using
      errcode = '22023',
      message = 'Only owned copies can be disposed.';
  end if;

  -- D-034: a deck entry that used this copy stays in its deck as virtual.
  update public.deck_cards
  set
    kind = 'virtual',
    binder_card_id = null
  where binder_card_id = any(p_copy_ids)
    and user_id = (select auth.uid());

  update public.binder_cards
  set
    status = p_disposal_status,
    disposed_at = now()
  where id = any(p_copy_ids)
    and user_id = (select auth.uid());

  return query
  select copy.*
  from public.binder_cards as copy
  where copy.id = any(p_copy_ids)
    and copy.user_id = (select auth.uid());
end;
$function$;

create function public.remove_deck_entries(
  p_entry_ids uuid[],
  p_binder_id uuid
)
returns setof public.binder_cards
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_requested integer;
  v_found integer;
  v_copy_ids uuid[];
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'An authenticated user is required.';
  end if;

  if p_entry_ids is null
    or cardinality(p_entry_ids) = 0
    or array_position(p_entry_ids, null) is not null
  then
    raise exception using
      errcode = '22023',
      message = 'At least one deck entry id is required, and none may be empty.';
  end if;

  if p_binder_id is not null and not exists (
    select 1
    from public.binders
    where id = p_binder_id
      and user_id = (select auth.uid())
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'Binder not found or not owned by the current user.';
  end if;

  select count(distinct requested.id)
  into v_requested
  from unnest(p_entry_ids) as requested(id);

  select count(*), array_agg(locked.binder_card_id)
    filter (where locked.kind = 'binder')
  into v_found, v_copy_ids
  from (
    select entry.id, entry.kind, entry.binder_card_id
    from public.deck_cards as entry
    where entry.id = any(p_entry_ids)
      and entry.user_id = (select auth.uid())
    for update
  ) as locked;

  if v_found <> v_requested then
    raise exception using
      errcode = 'P0002',
      message = 'Deck entry not found or not owned by the current user.';
  end if;

  v_copy_ids := coalesce(v_copy_ids, '{}');

  -- The deck_cards_sync_binder_copy_location trigger sends each owned copy
  -- to Loose when its entry is deleted; the update below then files it in
  -- the chosen folder. The entries must be gone first: the binder_cards
  -- update policy refuses a folder while a Binder-kind deck entry exists.
  delete from public.deck_cards
  where id = any(p_entry_ids)
    and user_id = (select auth.uid());

  if p_binder_id is not null and cardinality(v_copy_ids) > 0 then
    update public.binder_cards
    set binder_id = p_binder_id
    where id = any(v_copy_ids)
      and user_id = (select auth.uid());
  end if;

  return query
  select copy.*
  from public.binder_cards as copy
  where copy.id = any(v_copy_ids)
    and copy.user_id = (select auth.uid());
end;
$function$;

create function public.delete_deck_entries(p_entry_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_requested integer;
  v_found integer;
  v_copy_ids uuid[];
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'An authenticated user is required.';
  end if;

  if p_entry_ids is null
    or cardinality(p_entry_ids) = 0
    or array_position(p_entry_ids, null) is not null
  then
    raise exception using
      errcode = '22023',
      message = 'At least one deck entry id is required, and none may be empty.';
  end if;

  select count(distinct requested.id)
  into v_requested
  from unnest(p_entry_ids) as requested(id);

  select count(*), array_agg(locked.binder_card_id)
    filter (where locked.kind = 'binder')
  into v_found, v_copy_ids
  from (
    select entry.id, entry.kind, entry.binder_card_id
    from public.deck_cards as entry
    where entry.id = any(p_entry_ids)
      and entry.user_id = (select auth.uid())
    for update
  ) as locked;

  if v_found <> v_requested then
    raise exception using
      errcode = 'P0002',
      message = 'Deck entry not found or not owned by the current user.';
  end if;

  v_copy_ids := coalesce(v_copy_ids, '{}');

  -- Entries first: deck_cards.binder_card_id references the copy without
  -- a cascade, so the copy can only be deleted once its entry is gone.
  delete from public.deck_cards
  where id = any(p_entry_ids)
    and user_id = (select auth.uid());

  delete from public.binder_cards
  where id = any(v_copy_ids)
    and user_id = (select auth.uid());
end;
$function$;

revoke all on function public.delete_binder_copies(uuid[])
  from public, anon, authenticated;
grant execute on function public.delete_binder_copies(uuid[])
  to authenticated;

revoke all on function public.dispose_binder_copies(uuid[], text)
  from public, anon, authenticated;
grant execute on function public.dispose_binder_copies(uuid[], text)
  to authenticated;

revoke all on function public.remove_deck_entries(uuid[], uuid)
  from public, anon, authenticated;
grant execute on function public.remove_deck_entries(uuid[], uuid)
  to authenticated;

revoke all on function public.delete_deck_entries(uuid[])
  from public, anon, authenticated;
grant execute on function public.delete_deck_entries(uuid[])
  to authenticated;
