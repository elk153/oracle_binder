create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null
    check (length(btrim(name)) > 0),
  format text
    check (format is null or length(btrim(format)) > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index decks_user_name_unique_idx
  on public.decks (user_id, lower(btrim(name)));

create index decks_user_created_at_idx
  on public.decks (user_id, created_at desc, id);

create table public.deck_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  deck_id uuid not null
    references public.decks (id) on delete cascade,
  kind text not null
    check (kind in ('binder', 'proxy', 'virtual')),
  binder_card_id uuid
    references public.binder_cards (id),
  scryfall_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'binder' and binder_card_id is not null)
    or (kind in ('proxy', 'virtual') and binder_card_id is null)
  )
);

create index deck_cards_deck_id_idx
  on public.deck_cards (deck_id);

create index deck_cards_user_deck_created_at_idx
  on public.deck_cards (user_id, deck_id, created_at, id);

create unique index deck_cards_binder_card_unique_idx
  on public.deck_cards (binder_card_id)
  where binder_card_id is not null;

create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

create trigger deck_cards_set_updated_at
  before update on public.deck_cards
  for each row execute function public.set_updated_at();

alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;

revoke all on table public.decks from public, anon, authenticated;
revoke all on table public.deck_cards from public, anon, authenticated;
grant usage on schema public to authenticated;

grant select, insert, delete on table public.decks to authenticated;
grant update (name, format, notes) on table public.decks to authenticated;

grant select, insert, delete on table public.deck_cards to authenticated;
grant update (deck_id, kind, binder_card_id, scryfall_id)
  on table public.deck_cards to authenticated;

create policy "Users can read their own decks"
  on public.decks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own decks"
  on public.decks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own decks"
  on public.decks
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own decks"
  on public.decks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own deck cards"
  on public.deck_cards
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create deck cards in their own decks"
  on public.deck_cards
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.decks
      where decks.id = deck_cards.deck_id
        and decks.user_id = (select auth.uid())
    )
    and (
      binder_card_id is null
      or exists (
        select 1
        from public.binder_cards
        where binder_cards.id = deck_cards.binder_card_id
          and binder_cards.user_id = (select auth.uid())
          and binder_cards.status = 'owned'
      )
    )
  );

create policy "Users can update their own deck cards"
  on public.deck_cards
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.decks
      where decks.id = deck_cards.deck_id
        and decks.user_id = (select auth.uid())
    )
    and (
      binder_card_id is null
      or exists (
        select 1
        from public.binder_cards
        where binder_cards.id = deck_cards.binder_card_id
          and binder_cards.user_id = (select auth.uid())
          and binder_cards.status = 'owned'
      )
    )
  );

create policy "Users can delete their own deck cards"
  on public.deck_cards
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);