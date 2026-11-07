drop trigger deck_cards_sync_binder_copy_location on public.deck_cards;
drop function public.sync_binder_copy_deck_location();

drop function public.add_binder_copy_to_deck(uuid, uuid, uuid, text, jsonb);
drop function public.move_binder_copy_to_location(uuid, uuid, uuid, jsonb);

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
      or exists (
        select 1
        from public.binders
        where binders.id = binder_cards.binder_id
          and binders.user_id = (select auth.uid())
      )
    )
  );

update public.binder_cards as binder_copy
set binder_id = rollback_row.binder_id
from private.binder_copy_storage_rollback as rollback_row
join public.deck_cards as deck_entry
  on deck_entry.id = rollback_row.deck_card_id
 and deck_entry.deck_id = rollback_row.deck_id
 and deck_entry.binder_card_id = rollback_row.binder_card_id
 and deck_entry.kind = 'binder'
join public.binders as original_binder
  on original_binder.id = rollback_row.binder_id
where binder_copy.id = rollback_row.binder_card_id
  and binder_copy.binder_id is null;

drop table private.binder_copy_storage_rollback;
