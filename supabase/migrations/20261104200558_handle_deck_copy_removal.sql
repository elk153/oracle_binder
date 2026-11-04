create function public.remove_or_dispose_binder_copy(
  p_copy_id uuid,
  p_disposal_status text,
  p_copy_changes jsonb
)
returns void
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

  if p_disposal_status is not null
    and p_disposal_status not in ('sold', 'lost', 'given_away')
  then
    raise exception using
      errcode = '22023',
      message = 'Invalid disposal status.';
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
      'binder_id',
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

  if p_disposal_status is null and p_copy_changes <> '{}'::jsonb then
    raise exception using
      errcode = '22023',
      message = 'Copy changes are not allowed when deleting a copy.';
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

  update public.deck_cards
  set
    kind = 'virtual',
    binder_card_id = null
  where binder_card_id = v_copy.id
    and user_id = (select auth.uid());

  if p_disposal_status is null then
    delete from public.binder_cards
    where id = v_copy.id
      and user_id = (select auth.uid());
  else
    update public.binder_cards as copy
    set
      binder_id = case
        when p_copy_changes ? 'binder_id'
          then nullif(p_copy_changes ->> 'binder_id', '')::uuid
        else copy.binder_id
      end,
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
      status = p_disposal_status,
      disposed_at = now()
    where copy.id = v_copy.id
      and copy.user_id = (select auth.uid());
  end if;
end;
$function$;

revoke all on function public.remove_or_dispose_binder_copy(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.remove_or_dispose_binder_copy(uuid, text, jsonb)
  to authenticated;