# SemVer tag review for `main`

**Status:** Draft for manual review. No tags have been created.

This map groups the implemented decisions in `DECISIONS.md` into proposed
minor releases and gives commit hashes to visit on `main`. The major version
stays at `0`; no patch tags are proposed. Edit the tag names, commit hashes,
decision assignments, functionality descriptions, and review status before
requesting Step 2.

## Repository state reviewed

- `main` was at `bfbeb8a0ad8828f3df1d8bed2d53054678adccdc`
  (`corrected pop-up view and position`).
- `package.json` reports `0.0.0`.
- No `v*` SemVer tags exist. The existing annotated tags
  `binder-in-place` and `deck-in-place` are non-SemVer milestones; the proposed
  Binder and Decks release points below coincide with those milestones.
- `main` is two commits behind `dev`. The commits unique to `dev` at review
  time are `fc31a20` and `1160a19`; they are not included because this map is
  specifically for `main`. D-041 and D-042 are not present in the `main`
  decision list and should be considered only after their changes reach
  `main`.
- The worktree contains user edits to `AGENTS.md`; they were not changed while
  preparing this map. `CHANGELOG.md`, required by the versioning guidance, is
  absent from the worktree and will need to be created before a release.

## Proposed release points

| Review | Proposed tag | Commit on `main` | Functionality in annotated tag message | Decisions covered |
|---|---|---|---|---|
| [ ] | `v0.1.0` | `4a5ce0ee1cfb81469eaa1accad3d8a41ae2e2837` | `v0.1.0 — Make the V2 card browser the default` | D-001, D-002, D-003 |
| [ ] | `v0.2.0` | `3aba3409aaf284fe3ec8c9a05a76e1d11b459136` | `v0.2.0 — Add authentication and favorites` | D-006, D-007, D-008, D-009, D-010, D-011, D-012, D-014, D-016, D-017 |
| [ ] | `v0.3.0` | `f6ada1486b20a003c983e1a8536b6955101738b6` | `v0.3.0 — Add the Binder and personal-collection search` | D-018, D-019, D-023, D-024, D-025, D-026, D-027, D-028, D-029, D-030, D-031, D-032 |
| [ ] | `v0.4.0` | `7604dc27fbd53d0a387ddf69d1817db4ad539b51` | `v0.4.0 — Add deck management and card entries` | D-033, D-034, D-035, D-036, D-037 |
| [ ] | `v0.5.0` | `bfbeb8a0ad8828f3df1d8bed2d53054678adccdc` | `v0.5.0 — Remove the unused V1 routes and fix card popovers` | No implemented decision currently records this post-Decks cleanup and popover fix; see the notes below. |

The tag messages above are drafts. The explicit `vX.Y.0` text is included so
each annotated tag records both its SemVer number and the functionality it
marks.

### Commit waypoints

The proposed tag hashes are release endpoints, not an assertion that every
change in a release landed in one commit. These waypoints help review the
implementation sequence on `main`:

| Functionality / decisions | Commit waypoint |
|---|---|
| React card-browser baseline preceding the decision log | `69b6801` |
| App icon set and theme context (D-001, D-002) | `213453e`, `9a3ba03` |
| V2 browser made the default (D-003) | `4a5ce0e` |
| Auth/favorites schema and client (D-006, D-007) | `0886fd6` |
| Password auth, pagination, favorite actions (D-008–D-012, D-017) | `7ebf291`, `b378adc`, `dcd9447` |
| Database CLI/types (D-014, D-016) | `86cfe15`, `3aba340` |
| Binder navigation/action adjustments | `b05492c`, `2e9e9ac`, `ffa6c1e` |
| Card metadata, Binder schema, page and Realtime (D-018, D-023–D-032) | `c73331a`, `3e459c5`, `92ca3fb`, `f6ada14` |
| Deck schema, flows, page and release check (D-033–D-037) | `4b3165f`, `34742d0`, `d1ed11f`, `7604dc2` |
| V1 removal and popover corrections after the Decks milestone | `d070b00`, `bfbeb8a` |

## Review notes and exclusions

- D-021 and D-022 are still marked `Accepted` in `DECISIONS.md`, but the
  matching logout icon and card-action changes appear in `b05492c` and
  `2e9e9ac`. Confirm whether these decisions should be marked implemented and
  included with D-023–D-032 in `v0.3.0`.
- D-020 is an accepted roadmap, not a shippable feature. D-004 and D-005 are
  accepted project/security setup decisions. D-013 is marked `Not working`,
  D-015 is `Evaluating`, and D-038–D-040 are accepted but not implemented.
  They are not assigned release tags.
- D-003 says to keep V1 intact, while the later `d070b00` commit removes V1.
  The proposed `v0.5.0` treats that route removal as a minor change before
  `1.0.0`, consistent with the URL-contract bump rule in `AGENTS.md`. Confirm
  this grouping and add or identify a decision record for the cleanup.
- Older commits contain functionality predating the decision log. The first
  proposed release is cumulative: its endpoint includes the app baseline and
  the V2 work up to `4a5ce0e`.

## Step 2 compatibility check

The requested historical tags point at earlier commits. The release flow in
`AGENTS.md`, however, says to update `CHANGELOG.md` and run `npm version` on
the current `main`; that command updates the package files and creates a tag
at the current `HEAD`. Historical commits still contain `package.json` version
`0.0.0`. Before creating any tags, decide whether Step 2 should create
annotated tags directly at the reviewed historical hashes, or whether the
release flow should be changed to make the package version and tag history
consistent. Do not rewrite commits or force-update tags as part of this review.
