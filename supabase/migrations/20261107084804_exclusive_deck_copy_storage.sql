create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.binder_copy_storage_rollback (
  binder_card_id uuid primary key,
  binder_id uuid not null,
  deck_card_id uuid not null,
  deck_id uuid not null
);
alter table private.binder_copy_storage_rollback
  enable row level security;
revoke all on table private.binder_copy_storage_rollback
  from public, anon, authenticated;

insert into private.binder_copy_storage_rollback (
  binder_card_id,
  binder_id,
  deck_card_id,
  deck_id
)
select
  binder_copy.id,
  binder_copy.binder_id,
  deck_entry.id,
  deck_entry.deck_id
from public.binder_cards as binder_copy
join public.deck_cards as deck_entry
  on deck_entry.binder_card_id = binder_copy.id
 and deck_entry.kind = 'binder'
where binder_copy.binder_id is not null;

update public.binder_cards as binder_copy
set binder_id = null
where exists (
  select 1
  from public.deck_cards as deck_entry
  where deck_entry.binder_card_id = binder_copy.id
    and deck_entry.kind = 'binder'
);

drop policy "Users can update their own binder cards"
  on public.binder_cards;

create policy "Users can update their own binder cards"
  on public.binder_cards
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      binder_id is null
      or (
        exists (
          select 1
          from public.binders
          where binders.id = binder_cards.binder_id
            and binders.user_id = (select auth.uid())
        )
        and not exists (
          select 1
          from public.deck_cards
          where deck_cards.binder_card_id = binder_cards.id
            and deck_cards.kind = 'binder'
        )
      )
    )
  );

create function public.sync_binder_copy_deck_location()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    if old.kind = 'binder' then
      update public.binder_cards
      set binder_id = null
      where id = old.binder_card_id
        and user_id = (select auth.uid());
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
    and old.kind = 'binder'
    and (
      new.kind <> 'binder'
      or new.binder_card_id is distinct from old.binder_card_id
    )
  then
    update public.binder_cards
    set binder_id = null
    where id = old.binder_card_id
      and user_id = (select auth.uid());
  end if;

  if new.kind = 'binder' then
    update public.binder_cards
    set binder_id = null
    where id = new.binder_card_id
      and user_id = (select auth.uid())
      and status = 'owned'
      and scryfall_id = new.scryfall_id;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'A deck Binder entry must reference an owned copy of the same card.';
    end if;
  end if;

  return new;
end;
$function$;

create trigger deck_cards_sync_binder_copy_location
  after insert or update or delete on public.deck_cards
  for each row execute function public.sync_binder_copy_deck_location();

create function public.add_binder_copy_to_deck(
  p_copy_id uuid,
  p_deck_id uuid,
  p_scryfall_id uuid,
  p_rarity text,
  p_copy_changes jsonb
)
returns setof public.binder_cards
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_copy public.binder_cards%rowtype;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'An authenticated user is required.';
  end if;

  if p_copy_id is null or p_scryfall_id is null
    or p_rarity is null or length(btrim(p_rarity)) = 0
  then
    raise exception using
      errcode = '22023',
      message = 'A copy ID, card ID, and rarity are required.';
  end if;

  if p_copy_changes is null or jsonb_typeof(p_copy_changes) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Copy changes must be a JSON object.';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_copy_changes) as changes(field_name)
    where field_name not in (
      'acquisition_type',
      'acquisition_format',
      'condition',
      'finish',
      'language',
      'purchase_price',
      'acquired_at',
      'location',
      'notes'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'Copy changes contain an unsupported field.';
  end if;

  if not exists (
    select 1
    from public.decks
    where id = p_deck_id
      and user_id = (select auth.uid())
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'Deck not found or not owned by the current user.';
  end if;

  insert into public.binder_cards (
    id,
    user_id,
    binder_id,
    scryfall_id,
    rarity,
    status,
    acquisition_type,
    acquisition_format,
    condition,
    finish,
    language,
    purchase_price,
    acquired_at,
    location,
    notes
  )
  values (
    p_copy_id,
    (select auth.uid()),
    null,
    p_scryfall_id,
    p_rarity,
    'owned',
    p_copy_changes ->> 'acquisition_type',
    p_copy_changes ->> 'acquisition_format',
    p_copy_changes ->> 'condition',
    p_copy_changes ->> 'finish',
    p_copy_changes ->> 'language',
    (p_copy_changes ->> 'purchase_price')::numeric,
    (p_copy_changes ->> 'acquired_at')::timestamptz,
    p_copy_changes ->> 'location',
    p_copy_changes ->> 'notes'
  )
  returning * into v_copy;

  insert into public.deck_cards (
    user_id,
    deck_id,
    kind,
    binder_card_id,
    scryfall_id
  )
  values (
    (select auth.uid()),
    p_deck_id,
    'binder',
    v_copy.id,
    v_copy.scryfall_id
  );

  select *
  into v_copy
  from public.binder_cards
  where id = p_copy_id
    and user_id = (select auth.uid());

  return next v_copy;
  return;
end;
$function$;

create function public.move_binder_copy_to_location(
  p_copy_id uuid,
  p_binder_id uuid,
  p_deck_id uuid,
  p_copy_changes jsonb
)
returns setof public.binder_cards
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_copy public.binder_cards%rowtype;
  v_next_status text;
  v_deck_entry_id uuid;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'An authenticated user is required.';
  end if;

  if p_binder_id is not null and p_deck_id is not null then
    raise exception using
      errcode = '22023',
      message = 'A copy can have only one storage location.';
  end if;

  if p_copy_changes is null or jsonb_typeof(p_copy_changes) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Copy changes must be a JSON object.';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_copy_changes) as changes(field_name)
    where field_name not in (
      'status',
      'acquisition_type',
      'acquisition_format',
      'condition',
      'finish',
      'language',
      'purchase_price',
      'acquired_at',
      'location',
      'notes',
      'disposed_at',
      'disposal_price'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'Copy changes contain an unsupported field.';
  end if;

  select *
  into v_copy
  from public.binder_cards
  where id = p_copy_id
    and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Binder copy not found or not owned by the current user.';
  end if;

  v_next_status := coalesce(p_copy_changes ->> 'status', v_copy.status);
  if p_deck_id is not null and v_next_status <> 'owned' then
    raise exception using
      errcode = '22023',
      message = 'Only owned copies can be assigned to a deck.';
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

  if p_deck_id is not null and not exists (
    select 1
    from public.decks
    where id = p_deck_id
      and user_id = (select auth.uid())
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'Deck not found or not owned by the current user.';
  end if;

  select id
  into v_deck_entry_id
  from public.deck_cards
  where binder_card_id = v_copy.id
    and kind = 'binder'
    and user_id = (select auth.uid())
  for update;

  if p_deck_id is null then
    if v_deck_entry_id is not null then
      update public.deck_cards
      set kind = 'virtual',
          binder_card_id = null
      where id = v_deck_entry_id
        and user_id = (select auth.uid());
    end if;
  elsif v_deck_entry_id is not null then
    update public.deck_cards
    set deck_id = p_deck_id,
        scryfall_id = v_copy.scryfall_id
    where id = v_deck_entry_id
      and user_id = (select auth.uid());
  else
    insert into public.deck_cards (
      user_id,
      deck_id,
      kind,
      binder_card_id,
      scryfall_id
    )
    values (
      (select auth.uid()),
      p_deck_id,
      'binder',
      v_copy.id,
      v_copy.scryfall_id
    );
  end if;

  update public.binder_cards as copy
  set
    binder_id = case when p_deck_id is null then p_binder_id else null end,
    status = v_next_status,
    acquisition_type = case
      when p_copy_changes ? 'acquisition_type'
        then p_copy_changes ->> 'acquisition_type'
      else copy.acquisition_type
    end,
    acquisition_format = case
      when p_copy_changes ? 'acquisition_format'
        then p_copy_changes ->> 'acquisition_format'
      else copy.acquisition_format
    end,
    condition = case
      when p_copy_changes ? 'condition'
        then p_copy_changes ->> 'condition'
      else copy.condition
    end,
    finish = case
      when p_copy_changes ? 'finish'
        then p_copy_changes ->> 'finish'
      else copy.finish
    end,
    language = case
      when p_copy_changes ? 'language'
        then p_copy_changes ->> 'language'
      else copy.language
    end,
    purchase_price = case
      when p_copy_changes ? 'purchase_price'
        then (p_copy_changes ->> 'purchase_price')::numeric
      else copy.purchase_price
    end,
    acquired_at = case
      when p_copy_changes ? 'acquired_at'
        then (p_copy_changes ->> 'acquired_at')::timestamptz
      else copy.acquired_at
    end,
    location = case
      when p_copy_changes ? 'location'
        then p_copy_changes ->> 'location'
      else copy.location
    end,
    notes = case
      when p_copy_changes ? 'notes'
        then p_copy_changes ->> 'notes'
      else copy.notes
    end,
    disposed_at = case
      when p_copy_changes ? 'disposed_at'
        then (p_copy_changes ->> 'disposed_at')::timestamptz
      else copy.disposed_at
    end,
    disposal_price = case
      when p_copy_changes ? 'disposal_price'
        then (p_copy_changes ->> 'disposal_price')::numeric
      else copy.disposal_price
    end
  where copy.id = v_copy.id
    and copy.user_id = (select auth.uid())
  returning * into v_copy;

  return next v_copy;
  return;
end;
$function$;

revoke all on function public.sync_binder_copy_deck_location()
  from public, anon, authenticated;
revoke all on function public.add_binder_copy_to_deck(uuid, uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.move_binder_copy_to_location(uuid, uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.add_binder_copy_to_deck(uuid, uuid, uuid, text, jsonb)
  to authenticated;
grant execute on function public.move_binder_copy_to_location(uuid, uuid, uuid, jsonb)
  to authenticated;
grant execute on function public.sync_binder_copy_deck_location()
  to authenticated;