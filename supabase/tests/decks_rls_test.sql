begin;
select no_plan();

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'decks-owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'decks-other@example.com');

insert into public.decks (id, user_id, name)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '22222222-2222-2222-2222-222222222222',
  'Other user deck'
);

insert into public.binders (id, user_id, name)
values (
  '88888888-8888-8888-8888-888888888888',
  '11111111-1111-1111-1111-111111111111',
  'Storage test binder'
);

insert into public.deck_cards (
  id, user_id, deck_id, kind, scryfall_id
)
values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'virtual',
  '44444444-4444-4444-4444-444444444444'
);

insert into public.binder_cards (
  id, user_id, binder_id, scryfall_id, rarity, status
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    null,
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'rare',
    'owned'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    '88888888-8888-8888-8888-888888888888',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'common',
    'owned'
  );

select ok(
  not has_table_privilege('anon', 'public.decks', 'select, insert, update, delete'),
  'anon has no deck table privileges'
);
select ok(
  not has_table_privilege('anon', 'public.deck_cards', 'select, insert, update, delete'),
  'anon has no deck card table privileges'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.remove_or_dispose_binder_copy(uuid, text, jsonb)',
    'execute'
  ),
  'authenticated can execute the Binder copy removal function'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.remove_or_dispose_binder_copy(uuid, text, jsonb)',
    'execute'
  ),
  'anon cannot execute the Binder copy removal function'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.add_binder_copy_to_deck(uuid, uuid, uuid, text, jsonb)',
    'execute'
  ),
  'authenticated can execute the atomic add-to-deck function'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.add_binder_copy_to_deck(uuid, uuid, uuid, text, jsonb)',
    'execute'
  ),
  'anon cannot execute the atomic add-to-deck function'
);
select ok(
  has_table_privilege('authenticated', 'public.decks', 'select, insert, delete'),
  'authenticated can read, create, and delete decks'
);
select ok(
  has_column_privilege('authenticated', 'public.decks', 'name', 'update'),
  'authenticated can update deck metadata'
);
select ok(
  not has_column_privilege('authenticated', 'public.decks', 'user_id', 'update'),
  'authenticated cannot change deck ownership'
);
select ok(
  has_table_privilege('authenticated', 'public.deck_cards', 'select, insert, delete'),
  'authenticated can read, create, and delete deck cards'
);
select ok(
  has_column_privilege('authenticated', 'public.deck_cards', 'kind', 'update'),
  'authenticated can update deck card kind'
);
select ok(
  not has_column_privilege('authenticated', 'public.deck_cards', 'user_id', 'update'),
  'authenticated cannot change deck card ownership'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.decks'::regclass),
  'row level security is enabled on decks'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.deck_cards'::regclass),
  'row level security is enabled on deck cards'
);

set local role anon;
select throws_ok(
  $$select * from public.decks$$,
  '42501',
  null,
  'anon cannot read decks'
);
select throws_ok(
  $$select * from public.deck_cards$$,
  '42501',
  null,
  'anon cannot read deck cards'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  $$select public.remove_or_dispose_binder_copy(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'lost',
      '{}'::jsonb
    )$$,
  'P0002',
  null,
  'a user cannot remove or dispose another user binder copy'
);

select results_eq(
  $$insert into public.decks (id, name, format, notes)
    values (
      '12121212-1212-1212-1212-121212121212',
      'My Deck',
      'Commander',
      'Test notes'
    )
    returning name$$,
  array['My Deck'],
  'a user can create a deck with the default owner'
);

select throws_ok(
  $$insert into public.decks (name)
    values ('my deck')$$,
  '23505',
  null,
  'deck names are unique regardless of case'
);

select throws_ok(
  $$insert into public.decks (user_id, name)
    values (
      '22222222-2222-2222-2222-222222222222',
      'Spoofed deck'
    )$$,
  '42501',
  null,
  'a user cannot create a deck for another user'
);

select lives_ok(
  $$insert into public.decks (id, name)
    values ('34343434-3434-3434-3434-343434343434', 'Second deck')$$,
  'a user can create a second deck'
);

select results_eq(
  $$insert into public.deck_cards (
      deck_id, kind, binder_card_id, scryfall_id
    )
    values (
      '12121212-1212-1212-1212-121212121212',
      'binder',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    )
    returning kind$$,
  array['binder'],
  'a user can add their owned binder copy to a deck'
);

select throws_ok(
  $$insert into public.deck_cards (
      deck_id, kind, binder_card_id, scryfall_id
    )
    values (
      '34343434-3434-3434-3434-343434343434',
      'binder',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    )$$,
  '23505',
  null,
  'a binder copy cannot be placed in more than one deck'
);

select throws_ok(
  $$insert into public.deck_cards (
      deck_id, kind, binder_card_id, scryfall_id
    )
    values (
      '12121212-1212-1212-1212-121212121212',
      'binder',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'cccccccc-cccc-cccc-cccc-cccccccccccc'
    )$$,
  '42501',
  null,
  'a user cannot add another user binder copy to a deck'
);

select throws_ok(
  $$insert into public.deck_cards (deck_id, kind, scryfall_id)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'virtual',
      '45454545-4545-4545-4545-454545454545'
    )$$,
  '42501',
  null,
  'a user cannot add a card to another user deck'
);

select throws_ok(
  $$insert into public.deck_cards (deck_id, kind, scryfall_id)
    values (
      '12121212-1212-1212-1212-121212121212',
      'binder',
      '56565656-5656-5656-5656-565656565656'
    )$$,
  '23514',
  null,
  'binder deck rows require a binder copy'
);

select throws_ok(
  $$insert into public.deck_cards (
      deck_id, kind, binder_card_id, scryfall_id
    )
    values (
      '12121212-1212-1212-1212-121212121212',
      'virtual',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    )$$,
  '23514',
  null,
  'proxy and virtual rows cannot reference a binder copy'
);

select lives_ok(
  $$insert into public.deck_cards (deck_id, kind, scryfall_id)
    values (
      '12121212-1212-1212-1212-121212121212',
      'proxy',
      '67676767-6767-6767-6767-676767676767'
    )$$,
  'a user can add a proxy card'
);

select lives_ok(
  $$insert into public.deck_cards (deck_id, kind, scryfall_id)
    values (
      '12121212-1212-1212-1212-121212121212',
      'virtual',
      '78787878-7878-7878-7878-787878787878'
    )$$,
  'a user can add a virtual card'
);

select is(
  (select count(*)::integer from public.decks),
  2,
  'a user sees only their own decks'
);
select is(
  (select count(*)::integer from public.deck_cards),
  3,
  'a user sees only their own deck cards'
);

select is_null(
  (select binder_id from public.binder_cards
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'assigning a binder copy to a deck clears its binder folder'
);
select throws_ok(
  $$update public.binder_cards
    set binder_id = '88888888-8888-8888-8888-888888888888'
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  '42501',
  null,
  'a deck-assigned copy cannot also be assigned to a binder'
);

select results_eq(
  $$select id::text
    from public.add_binder_copy_to_deck(
      '81818181-8181-8181-8181-818181818181',
      '12121212-1212-1212-1212-121212121212',
      '90909090-9090-9090-9090-909090909090',
      'common',
      '{"condition":"Near Mint"}'::jsonb
    )$$,
  array['81818181-8181-8181-8181-818181818181'],
  'a user can atomically add an owned copy directly to a deck'
);
select is_null(
  (select binder_id from public.binder_cards
    where id = '81818181-8181-8181-8181-818181818181'),
  'a new deck-assigned copy has no binder folder'
);
select is(
  (select kind from public.deck_cards
    where binder_card_id = '81818181-8181-8181-8181-818181818181'),
  'binder',
  'adding a copy to a deck creates its linked physical entry'
);
select throws_ok(
  $$select public.add_binder_copy_to_deck(
      '92929292-9292-9292-9292-929292929292',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '93939393-9393-9393-9393-939393939393',
      'rare',
      '{}'::jsonb
    )$$,
  'P0002',
  null,
  'a user cannot add a binder copy to another user deck'
);

select lives_ok(
  $$select public.move_binder_copy_to_location(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      '88888888-8888-8888-8888-888888888888',
      null,
      '{"notes":"Moved into binder"}'::jsonb
    )$$,
  'a user can move a deck-assigned copy into a binder'
);
select is(
  (select kind from public.deck_cards
    where scryfall_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  'virtual',
  'moving a copy to a binder preserves its deck entry as virtual'
);
select is(
  (select binder_id::text from public.binder_cards
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  '88888888-8888-8888-8888-888888888888',
  'a moved copy is assigned to its selected binder'
);

insert into public.decks (id, name)
values (
  '98989898-9898-9898-9898-989898989898',
  'Delete test deck'
);
select lives_ok(
  $$select public.move_binder_copy_to_location(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      null,
      '98989898-9898-9898-9898-989898989898',
      '{}'::jsonb
    )$$,
  'a user can move a binder copy into a deck'
);
select is_null(
  (select binder_id from public.binder_cards
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'moving a binder copy into a deck clears its binder folder'
);
select is(
  (select deck_id::text from public.deck_cards
    where binder_card_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  '98989898-9898-9898-9898-989898989898',
  'moving a copy to a deck keeps one linked physical entry'
);

delete from public.decks
where id = '98989898-9898-9898-9898-989898989898';
select is_null(
  (select binder_id from public.binder_cards
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'deleting a deck returns its physical copies to Loose'
);
select is_empty(
  $$select id from public.deck_cards
    where binder_card_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  'deleting a deck removes its physical assignment'
);
delete from public.deck_cards
where deck_id = '12121212-1212-1212-1212-121212121212'
  and scryfall_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  and kind = 'virtual';
select lives_ok(
  $$insert into public.deck_cards (
      deck_id, kind, binder_card_id, scryfall_id
    )
    values (
      '12121212-1212-1212-1212-121212121212',
      'binder',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    )$$,
  'a released copy can be assigned to a deck again'
);

select results_eq(
  $$update public.decks
    set notes = 'Updated notes'
    where id = '12121212-1212-1212-1212-121212121212'
    returning notes$$,
  array['Updated notes'],
  'a user can update metadata on their own deck'
);

select throws_ok(
  $$update public.deck_cards
    set deck_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    where deck_id = '12121212-1212-1212-1212-121212121212'
      and kind = 'proxy'$$,
  '42501',
  null,
  'a user cannot move their deck card into another user deck'
);

select is_empty(
  $$update public.deck_cards
    set scryfall_id = '55555555-5555-5555-5555-555555555555'
    where id = '33333333-3333-3333-3333-333333333333'
    returning id$$,
  'a user cannot update another user deck card'
);
select throws_ok(
  $$update public.deck_cards
    set user_id = '22222222-2222-2222-2222-222222222222'
    where deck_id = '12121212-1212-1212-1212-121212121212'$$,
  '42501',
  null,
  'a user cannot update deck card ownership'
);

reset role;
alter table public.binder_cards
  add constraint d034_test_disposal_failure
  check (status <> 'lost');
set local role authenticated;
select throws_ok(
  $$select public.remove_or_dispose_binder_copy(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'lost',
      '{}'::jsonb
    )$$,
  '23514',
  null,
  'a failed disposal rolls back the deck conversion'
);
select is(
  (select kind from public.deck_cards
    where binder_card_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'binder',
  'a failed disposal leaves its deck entry linked'
);
select is(
  (select status from public.binder_cards
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'owned',
  'a failed disposal leaves its copy owned'
);
reset role;
alter table public.binder_cards
  drop constraint d034_test_disposal_failure;
set local role authenticated;

select lives_ok(
  $$select public.remove_or_dispose_binder_copy(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'sold',
      '{"notes":"Disposed from copy editor","binder_id":null}'::jsonb
    )$$,
  'a user can dispose a copy in a deck'
);
select is(
  (select kind from public.deck_cards
    where scryfall_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  'virtual',
  'disposing a copy keeps its deck entry as virtual'
);
select is_null(
  (select binder_card_id from public.deck_cards
    where scryfall_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  'disposing a copy clears the deck entry binder reference'
);
select is(
  (select status from public.binder_cards
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'sold',
  'disposing a copy updates its status'
);
select is(
  (select notes from public.binder_cards
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'Disposed from copy editor',
  'disposal saves copy metadata in the same transaction'
);

insert into public.binder_cards (
  id, user_id, scryfall_id, rarity, status
)
values (
  '12121212-3434-5656-7878-909090909090',
  '11111111-1111-1111-1111-111111111111',
  'abababab-cdcd-efef-0101-232323232323',
  'common',
  'owned'
);
insert into public.deck_cards (
  id, deck_id, kind, binder_card_id, scryfall_id
)
values (
  '34343434-5656-7878-9090-121212121212',
  '34343434-3434-3434-3434-343434343434',
  'binder',
  '12121212-3434-5656-7878-909090909090',
  'abababab-cdcd-efef-0101-232323232323'
);
select lives_ok(
  $$select public.remove_or_dispose_binder_copy(
      '12121212-3434-5656-7878-909090909090',
      null,
      '{}'::jsonb
    )$$,
  'a user can delete a copy in a deck'
);
select is_empty(
  $$select id from public.binder_cards
    where id = '12121212-3434-5656-7878-909090909090'$$,
  'deleting a copy removes it from the Binder'
);
select is(
  (select kind from public.deck_cards
    where id = '34343434-5656-7878-9090-121212121212'),
  'virtual',
  'deleting a copy keeps its deck entry as virtual'
);
select is_null(
  (select binder_card_id from public.deck_cards
    where id = '34343434-5656-7878-9090-121212121212'),
  'deleting a copy clears the deck entry binder reference'
);

select lives_ok(
  $$insert into public.decks (id, name)
    values ('89898989-8989-8989-8989-898989898989', 'Delete cascade test')$$,
  'a user can create a deck for the cascade test'
);
select lives_ok(
  $$insert into public.deck_cards (id, deck_id, kind, scryfall_id)
    values (
      '90909090-9090-9090-9090-909090909090',
      '89898989-8989-8989-8989-898989898989',
      'virtual',
      'abababab-abab-abab-abab-abababababab'
    )$$,
  'a user can add a card to the cascade-test deck'
);
select lives_ok(
  $$delete from public.decks
    where id = '89898989-8989-8989-8989-898989898989'$$,
  'a user can delete their own deck'
);
select is_empty(
  $$select id from public.deck_cards
    where id = '90909090-9090-9090-9090-909090909090'$$,
  'deleting a deck removes its rows'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::integer from public.decks),
  1,
  'another user sees their own deck'
);
select is(
  (select count(*)::integer from public.deck_cards),
  1,
  'another user sees only their own deck cards'
);

select * from finish();
rollback;
