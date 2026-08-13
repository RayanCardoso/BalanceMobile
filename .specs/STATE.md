# Project State — Balance Mobile

Project memory for the Balance mobile app. Decisions here are project-level constraints every future
feature must conform to or explicitly supersede.

This repository is **separate from `backend/`**. The backend keeps its own `.specs/` with decisions
AD-001 through AD-006 and ten lessons; those govern the API and are referenced here, not copied.

---

## Decisions

### MAD-001: The app owns no business rule

**Status:** active
**Date:** 2026-08-13
**Feature:** balance-mobile-app

Every rule the Balance API implements stays in the API. The app sends inputs and renders responses. It
does not compute a competence month, does not decide a status, does not split an installment total and
does not validate anything the server validates — beyond emptiness and number format, which exist only
to avoid a pointless round trip.

**Consequence:** when a rule seems to be missing from a screen, the fix is a backend endpoint or a
richer response, never a client-side reimplementation. Two implementations of one rule is two rules.

### MAD-002: Server state is TanStack Query's; client state is Zustand's

**Status:** active
**Date:** 2026-08-13
**Feature:** balance-mobile-app

Anything that came from the API lives in the Query cache, keyed through `shared/api/queryKeys.ts`.
Zustand holds the session and nothing else. A mutation declares which keys it invalidates.

**Consequence:** a screen that does not refresh after a write is a missing or mistyped invalidation,
not a missing store. Query keys are built by factories so a mutation cannot invalidate a string the
query never registered.

### MAD-003: A mutation invalidates the month the API returned

**Status:** active
**Date:** 2026-08-13
**Feature:** balance-mobile-app

When a write's response carries a period — an expense's `competenceMonth`, an installment plan's
generated months — invalidation and any user feedback use that value, never the month currently on
screen.

**Consequence:** a credit purchase past the closing day lands in the next month, and the user is told
so rather than watching it apparently vanish from the list they were looking at.

### MAD-004: The API's error messages are shown verbatim

**Status:** active
**Date:** 2026-08-13
**Feature:** balance-mobile-app

400 responses carry `errorMessages`, already localised to pt-BR by the API. The app renders them as
they arrive. A 404 means "not found or not yours" (backend AD-004) and is never phrased as a
permission error.

**Consequence:** the app never carries its own copy of a validation message, so the two cannot
disagree after a backend change.

---

## Handoff

**Last updated:** 2026-08-13
**Branch:** `master`
**Feature in flight:** `balance-mobile-app`

**Where things stand:** the repository was initialised and the feature is specified, designed and
broken into 48 tasks across 10 phases. `validate_spec` passes with 0 errors and 0 warnings;
`validate_tasks` passes with 0 errors and 3 advisory warnings, all on tasks that legitimately carry no
tests (scaffold, tsconfig, README) and which the Test Coverage Matrix now names explicitly. No
implementation has started and there are no commits yet beyond the artifacts.

**Known limits carried into the delivery:**

- No Android or iOS emulator is available in this session. `expo start --web` is the only rendering
  surface the agent can reach; nothing verifies how the app looks on a device.
- `ResponseRecurringExpenseLineJson` does not expose the payment's id, so correcting a recurring
  payment recorded in a previous run of the app is unreachable. Recorded in `design.md` as an open
  risk and in the spec's Out of Scope — it needs a backend change to close properly.

**Environment notes:**

- System `node` is v12.6.0 and cannot run this toolchain. NVM holds v20.19.4; `nvm use` needs
  administrator rights, so Node is invoked by absolute path: `%APPDATA%\nvm\v20.19.4\node.exe`
  (ships npm 10.8.2). Verified working.
- The skill's validators run on LibreOffice's bundled CPython 3.10.19 at
  `C:\Program Files\LibreOffice\program\python.exe`. The `python` and `python3` names on PATH are
  Microsoft Store stubs and do not work.
- The backend API runs from `backend/` on `http://localhost:5126`; PostgreSQL is in Docker on host
  port **5434**, because local PostgreSQL services hold 5432 and 5433. The database is seeded with an
  August 2026 fixture; credentials are in `frontend/scripts/seed.mjs`.
- The backend's CORS policy currently names only `http://localhost:5173`. T46 adds the Expo web origin.
