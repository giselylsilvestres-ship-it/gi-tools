# Academia v3 — preview branch

The workout screen records each set, including independent load, reps and completion for each drop. Supersets wait for all exercises in the same round (including drops) before starting rest. Routines support per-set types, rep targets, rest, supersets, reordering, duplication and catalog selection. Sessions include notes, duration, completed volume and per-exercise history.

## Data and compatibility

`db/academia-v3.sql` adds optional JSON snapshots to existing sheets and sessions, plus an optimistic session revision. No old rows are rewritten. `gym_save_workout` runs as the signed-in user with existing RLS, verifies sheet ownership, and writes the complete snapshot atomically. Stale revisions raise `WORKOUT_CONFLICT`. The migration was applied to the personal Gica Tools project; production frontend/main has not been updated.

The old log FK points to sheet exercise IDs while the old UI sent catalog IDs. V3 snapshots do not use that mismatched FK. Legacy logs are read as aggregates and never expanded into invented completed sets.

A local checkpoint is written on every edit. Failed network writes remain visibly unsynced with retry. Cross-device conflicts require choosing the account or local version; both are checkpointed before resolution. The app preserves the existing one-session-per-date constraint. Concurrent edits to routine definitions do not yet have session-style revision checks.

## Review URLs after preview deployment

- `/academia/demo.html`: isolated fictional data, local browser persistence only; no Supabase writes.
- `/academia/`: authenticated real account; same production database, so saving here changes real account data.

## Validation

- `node --test academia/tests/core.test.cjs`: seven unit tests covering drop chains, unequal supersets, zero load, previous-load reuse, legacy preservation and orphan groups.
- `node academia/tests/browser.cjs`: a self-contained local static server + Playwright flow; optional `GYM_CHROMIUM` executable path. Covers mobile/tablet layout, rest behavior, independent drop round trip, failed sync/retry, cross-device conflict resolution, partial completion, routine edits/duplication, and history. Browser demo uses an isolated adapter; it does not assert authenticated live Supabase requests.
- Live database transaction, rolled back: snapshot round trip, revisions, stale-write rejection, RLS isolation and foreign-sheet rejection.
- Supabase security advisors: no new database findings. Existing leaked-password protection warning is unrelated to this feature.

## Release

Release is authorized after review of the interactive demo. Deployments must retain Supabase authentication and existing RLS; the demo route remains isolated from real account data. Validate the deployed demo and unauthenticated redirect before completing the release.
