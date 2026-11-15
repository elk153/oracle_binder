begin;
select no_plan();

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'binder-owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'binder-other@example.com');

insert into public.binders (id, user_id, name)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '22222222-2222-2222-2222-222222222222',
  'Other user binder'
);

insert into public.binder_cards (
  id, user_id, binder_id, scryfall_id, rarity, status
)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'rare',
  'owned'
);

select ok(
  not has_table_privilege('anon', 'public.binders', 'select, insert, update, delete'),
  'anon has no binder table privileges'
);
select ok(
  not has_table_privilege('anon', 'public.binder_cards', 'select, insert, update, delete'),
  'anon has no binder card table privileges'
);
select ok(
  has_table_privilege('authenticated', 'public.binders', 'select, insert, delete'),
  'authenticated can read, create, and delete binders'
);
select ok(
  has_column_privilege('authenticated', 'public.binders', 'name', 'update'),
  'authenticated can update binder names'
);
select ok(
  has_column_privilege('authenticated', 'public.binders', 'color', 'update'),
  'authenticated can update binder cover colors'
);
select ok(
  not has_column_privilege('authenticated', 'public.binders', 'user_id', 'update'),
  'authenticated cannot change binder ownership'
);
select ok(
  has_table_privilege('authenticated', 'public.binder_cards', 'select, insert, delete'),
  'authenticated can read, create, and delete binder cards'
);
select ok(
  has_column_privilege('authenticated', 'public.binder_cards', 'purchase_price', 'update'),
  'authenticated can update binder card metadata'
);
select ok(
  not has_column_privilege('authenticated', 'public.binder_cards', 'user_id', 'update'),
  'authenticated cannot change binder card ownership'
);
select ok(
  not has_column_privilege('authenticated', 'public.binder_cards', 'scryfall_id', 'update'),
  'authenticated cannot change a copy card identity'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.binders'::regclass),
  'row level security is enabled on binders'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.binder_cards'::regclass),
  'row level security is enabled on binder cards'
);

set local role anon;
select throws_ok(
  $$select * from public.binders$$,
  '42501',
  null,
  'anon cannot read binders'
);
select throws_ok(
  $$select * from public.binder_cards$$,
  '42501',
  null,
  'anon cannot read binder cards'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$insert into public.binders (id, name)
    values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'My Binder')
    returning name$$,
  array['My Binder'],
  'a user can create a binder with the default owner'
);

select throws_ok(
  $$insert into public.binders (name)
    values ('my binder')$$,
  '23505',
  null,
  'binder names are unique regardless of case'
);

select throws_ok(
  $$insert into public.binders (user_id, name)
    values (
      '22222222-2222-2222-2222-222222222222',
      'Spoofed binder'
    )$$,
  '42501',
  null,
  'a user cannot create a binder for another user'
);

select results_eq(
  $$select color from public.binders
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  array['#1f2a6b'],
  'a binder created without a color gets the default cover color'
);

select throws_ok(
  $$insert into public.binders (name, color)
    values ('Bad color name', 'red')$$,
  '23514',
  null,
  'binder colors must look like #rrggbb'
);

select throws_ok(
  $$insert into public.binders (name, color)
    values ('Uppercase color', '#7A2A2A')$$,
  '23514',
  null,
  'binder colors must be lowercase hex'
);

select results_eq(
  $$update public.binders
    set color = '#7a2a2a'
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
    returning color$$,
  array['#7a2a2a'],
  'a user can change the cover color of their own binder'
);

select throws_ok(
  $$update public.binders
    set color = 'blue'
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  '23514',
  null,
  'a binder color update must also look like #rrggbb'
);

select is_empty(
  $$update public.binders
    set color = '#7a2a2a'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    returning id$$,
  'a user cannot change the cover color of another user binder'
);

select results_eq(
  $$insert into public.binder_cards (
      id, binder_id, scryfall_id, rarity, status
    )
    values (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      'mythic',
      'owned'
    )
    returning user_id::text$$,
  array['11111111-1111-1111-1111-111111111111'],
  'a user can add a copy to their own binder'
);

select results_eq(
  $$insert into public.binder_cards (
      id, scryfall_id, rarity, status
    )
    values (
      '12121212-1212-1212-1212-121212121212',
      '34343434-3434-3434-3434-343434343434',
      'common',
      'owned'
    )
    returning binder_id::text$$,
  array[null::text],
  'a user can create a loose copy with no binder'
);

select throws_ok(
  $$insert into public.binder_cards (
      scryfall_id, rarity, status, purchase_price
    )
    values (
      '45454545-4545-4545-4545-454545454545',
      'common',
      'owned',
      -1
    )$$,
  '23514',
  null,
  'purchase prices cannot be negative'
);

select throws_ok(
  $$insert into public.binder_cards (
      binder_id, scryfall_id, rarity, status
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '56565656-5656-5656-5656-565656565656',
      'uncommon',
      'owned'
    )$$,
  '42501',
  null,
  'a user cannot attach a card to another user binder'
);

select is(
  (select count(*)::integer from public.binders),
  1,
  'a user sees only their own binders'
);
select is(
  (select count(*)::integer from public.binder_cards),
  2,
  'a user sees only their own binder cards'
);

select results_eq(
  $$update public.binder_cards
    set purchase_price = 1.25
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    returning purchase_price::text$$,
  array['1.25'],
  'a user can update editable metadata on their own copy'
);
select is_empty(
  $$update public.binder_cards
    set notes = 'unauthorized'
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    returning id$$,
  'a user cannot update another user copy'
);
select is_empty(
  $$delete from public.binder_cards
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    returning id$$,
  'a user cannot delete another user copy'
);

select throws_ok(
  $$update public.binder_cards
    set user_id = '22222222-2222-2222-2222-222222222222'
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  '42501',
  null,
  'a user cannot update binder card ownership'
);

select lives_ok(
  $$delete from public.binders
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  'a user can delete their own binder'
);
select is_null(
  (select binder_id from public.binder_cards
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  'deleting a binder moves its cards to loose'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::integer from public.binders),
  1,
  'another user sees their own binder'
);
select is(
  (select count(*)::integer from public.binder_cards),
  1,
  'another user sees their own card'
);

select * from finish();
rollback;
