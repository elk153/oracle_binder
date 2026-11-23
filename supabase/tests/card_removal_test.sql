-- D-079: bulk delete, dispose and remove for Binder copies and deck entries.
begin;
select no_plan();

-- Users: 1111… does the work, 2222… owns rows that must never change.
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'removal-owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'removal-other@example.com');

insert into public.binders (id, user_id, name)
values
  ('a0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Folder A'),
  ('a0000000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', 'Folder B'),
  ('a0000000-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222', 'Other folder');

insert into public.decks (id, user_id, name)
values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Removal deck'),
  ('d0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Other deck');

-- Copies (c…NN). Copies that will sit in the deck start Loose.
insert into public.binder_cards (id, user_id, binder_id, scryfall_id, rarity, status)
values
  ('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-000000000001', 'rare', 'owned'),
  ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-000000000002', 'rare', 'owned'),
  ('c0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', null, 'f0000000-0000-0000-0000-000000000003', 'rare', 'owned'),
  ('c0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', null, 'f0000000-0000-0000-0000-000000000004', 'rare', 'owned'),
  ('c0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', null, 'f0000000-0000-0000-0000-000000000005', 'rare', 'sold'),
  ('c0000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', null, 'f0000000-0000-0000-0000-000000000006', 'rare', 'owned'),
  ('c0000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', null, 'f0000000-0000-0000-0000-000000000007', 'rare', 'owned'),
  ('c0000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', null, 'f0000000-0000-0000-0000-000000000009', 'rare', 'owned'),
  ('c0000000-0000-0000-0000-000000000020', '22222222-2222-2222-2222-222222222222', null, 'f0000000-0000-0000-0000-000000000020', 'rare', 'owned');

insert into public.deck_cards (id, user_id, deck_id, kind, scryfall_id)
values (
  'e0000000-0000-0000-0000-000000000020',
  '22222222-2222-2222-2222-222222222222',
  'd0000000-0000-0000-0000-000000000002',
  'virtual',
  'f0000000-0000-0000-0000-000000000020'
);

-- Binder-kind entries go in as the owner, so the location trigger sees auth.uid().
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

insert into public.deck_cards (id, deck_id, kind, binder_card_id, scryfall_id)
values
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'binder', 'c0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003'),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'binder', 'c0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000004'),
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'binder', 'c0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'binder', 'c0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000007'),
  ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000001', 'binder', 'c0000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000009');

insert into public.deck_cards (id, deck_id, kind, scryfall_id)
values
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 'proxy', 'f0000000-0000-0000-0000-000000000008'),
  ('e0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000001', 'virtual', 'f0000000-0000-0000-0000-000000000010');

reset role;

-- Privileges -----------------------------------------------------------------

select ok(
  has_function_privilege('authenticated', 'public.delete_binder_copies(uuid[])', 'execute'),
  'authenticated can execute delete_binder_copies'
);
select ok(
  not has_function_privilege('anon', 'public.delete_binder_copies(uuid[])', 'execute'),
  'anon cannot execute delete_binder_copies'
);
select ok(
  has_function_privilege('authenticated', 'public.dispose_binder_copies(uuid[], text)', 'execute'),
  'authenticated can execute dispose_binder_copies'
);
select ok(
  not has_function_privilege('anon', 'public.dispose_binder_copies(uuid[], text)', 'execute'),
  'anon cannot execute dispose_binder_copies'
);
select ok(
  has_function_privilege('authenticated', 'public.remove_deck_entries(uuid[], uuid)', 'execute'),
  'authenticated can execute remove_deck_entries'
);
select ok(
  not has_function_privilege('anon', 'public.remove_deck_entries(uuid[], uuid)', 'execute'),
  'anon cannot execute remove_deck_entries'
);
select ok(
  has_function_privilege('authenticated', 'public.delete_deck_entries(uuid[])', 'execute'),
  'authenticated can execute delete_deck_entries'
);
select ok(
  not has_function_privilege('anon', 'public.delete_deck_entries(uuid[])', 'execute'),
  'anon cannot execute delete_deck_entries'
);

set local role anon;
select throws_ok(
  $$select public.delete_binder_copies(array['c0000000-0000-0000-0000-000000000002']::uuid[])$$,
  '42501',
  null,
  'anon cannot call delete_binder_copies'
);

-- Owner ----------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- Setup check: copies in the deck are Loose (the trigger cleared their folder).
select is(
  (select count(*)::integer from public.deck_cards
    where deck_id = 'd0000000-0000-0000-0000-000000000001'),
  7,
  'setup: the owner deck has seven entries'
);

-- Input checks
select throws_ok(
  $$select public.delete_binder_copies('{}'::uuid[])$$,
  '22023',
  null,
  'an empty id list is rejected'
);
select throws_ok(
  $$select public.delete_deck_entries(array[null]::uuid[])$$,
  '22023',
  null,
  'an id list containing null is rejected'
);
select throws_ok(
  $$select * from public.dispose_binder_copies(
      array['c0000000-0000-0000-0000-000000000001']::uuid[],
      'stolen'
    )$$,
  '22023',
  null,
  'an unknown disposal status is rejected'
);

-- dispose_binder_copies
select throws_ok(
  $$select * from public.dispose_binder_copies(
      array['c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000020']::uuid[],
      'sold'
    )$$,
  'P0002',
  null,
  'disposing fails as a whole when one copy belongs to another user'
);
select throws_ok(
  $$select * from public.dispose_binder_copies(
      array['c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005']::uuid[],
      'sold'
    )$$,
  '22023',
  null,
  'disposing fails as a whole when one copy is already disposed'
);
select is(
  (select status from public.binder_cards where id = 'c0000000-0000-0000-0000-000000000001'),
  'owned',
  'a failed disposal leaves the copy owned'
);

select is(
  (select count(*)::integer from public.dispose_binder_copies(
    array['c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003']::uuid[],
    'lost'
  )),
  2,
  'disposing two copies returns both updated rows'
);
select results_eq(
  $$select status, disposed_at is not null, binder_id
    from public.binder_cards
    where id = 'c0000000-0000-0000-0000-000000000001'$$,
  $$values ('lost'::text, true, 'a0000000-0000-0000-0000-00000000000a'::uuid)$$,
  'a disposed copy gets its status and date and keeps its folder'
);
select results_eq(
  $$select kind, binder_card_id
    from public.deck_cards
    where id = 'e0000000-0000-0000-0000-000000000003'$$,
  $$values ('virtual'::text, null::uuid)$$,
  'disposing a copy in a deck turns its entry virtual'
);

-- delete_binder_copies
select throws_ok(
  $$select public.delete_binder_copies(
      array['c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000020']::uuid[]
    )$$,
  'P0002',
  null,
  'deleting fails as a whole when one copy belongs to another user'
);
select is(
  (select count(*)::integer from public.binder_cards where id = 'c0000000-0000-0000-0000-000000000002'),
  1,
  'a failed delete keeps the copy'
);

select lives_ok(
  $$select public.delete_binder_copies(
      array[
        'c0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000004',
        'c0000000-0000-0000-0000-000000000005'
      ]::uuid[]
    )$$,
  'the owner can delete owned, in-deck and disposed copies together'
);
select is(
  (select count(*)::integer from public.binder_cards
    where id in (
      'c0000000-0000-0000-0000-000000000002',
      'c0000000-0000-0000-0000-000000000004',
      'c0000000-0000-0000-0000-000000000005'
    )),
  0,
  'the deleted copies are gone'
);
select results_eq(
  $$select kind, binder_card_id
    from public.deck_cards
    where id = 'e0000000-0000-0000-0000-000000000004'$$,
  $$values ('virtual'::text, null::uuid)$$,
  'deleting a copy in a deck turns its entry virtual'
);

-- remove_deck_entries
select throws_ok(
  $$select * from public.remove_deck_entries(
      array['e0000000-0000-0000-0000-000000000006']::uuid[],
      'a0000000-0000-0000-0000-00000000000c'
    )$$,
  'P0002',
  null,
  'removing into another user folder is rejected'
);
select throws_ok(
  $$select * from public.remove_deck_entries(
      array['e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000020']::uuid[],
      null
    )$$,
  'P0002',
  null,
  'removing fails as a whole when one entry belongs to another user'
);
select is(
  (select count(*)::integer from public.deck_cards where id = 'e0000000-0000-0000-0000-000000000006'),
  1,
  'a failed removal keeps the entry'
);

select is(
  (select count(*)::integer from public.remove_deck_entries(
    array['e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000008']::uuid[],
    'a0000000-0000-0000-0000-00000000000b'
  )),
  1,
  'removing an owned and a proxy entry returns the one owned copy'
);
select is(
  (select binder_id from public.binder_cards where id = 'c0000000-0000-0000-0000-000000000006'),
  'a0000000-0000-0000-0000-00000000000b'::uuid,
  'the removed owned copy lands in the chosen folder'
);
select is(
  (select count(*)::integer from public.deck_cards
    where id in ('e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000008')),
  0,
  'the removed entries are gone'
);

select lives_ok(
  $$select * from public.remove_deck_entries(
      array['e0000000-0000-0000-0000-000000000007']::uuid[],
      null
    )$$,
  'the owner can remove an entry to Loose'
);
select results_eq(
  $$select binder_id, status
    from public.binder_cards
    where id = 'c0000000-0000-0000-0000-000000000007'$$,
  $$values (null::uuid, 'owned'::text)$$,
  'a copy removed to Loose has no folder and stays owned'
);

-- delete_deck_entries
select throws_ok(
  $$select public.delete_deck_entries(
      array['e0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000020']::uuid[]
    )$$,
  'P0002',
  null,
  'deleting entries fails as a whole when one belongs to another user'
);
select is(
  (select count(*)::integer from public.binder_cards where id = 'c0000000-0000-0000-0000-000000000009'),
  1,
  'a failed entry delete keeps the copy'
);

select lives_ok(
  $$select public.delete_deck_entries(
      array['e0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000010']::uuid[]
    )$$,
  'the owner can delete an owned and a virtual entry together'
);
select is(
  (select count(*)::integer from public.deck_cards
    where id in ('e0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000010')),
  0,
  'the deleted entries are gone'
);
select is(
  (select count(*)::integer from public.binder_cards where id = 'c0000000-0000-0000-0000-000000000009'),
  0,
  'deleting an owned entry also deletes its copy'
);

-- The other user's rows were never touched ------------------------------------

reset role;
select is(
  (select count(*)::integer from public.binder_cards where user_id = '22222222-2222-2222-2222-222222222222'),
  1,
  'the other user copy still exists'
);
select is(
  (select count(*)::integer from public.deck_cards where user_id = '22222222-2222-2222-2222-222222222222'),
  1,
  'the other user deck entry still exists'
);

select * from finish();
rollback;
