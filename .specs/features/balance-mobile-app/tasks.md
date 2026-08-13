# Balance Mobile App Tasks

**Spec**: `.specs/features/balance-mobile-app/spec.md`
**Design**: `.specs/features/balance-mobile-app/design.md`
**Status**: Awaiting approval

49 tasks across 11 phases. Every task ends in one atomic commit.

Two tasks change the **backend** repository and commit there, not here: T46 and T49, both in Phase 0.
Everything else is mobile-only.

---

## Gate Check Commands

The system `node` is v12.6.0 and cannot run this toolchain. `nvm use` needs administrator rights and is
not available, so Node 20 is reached by path.

**Prepending the NVM directory to `PATH` is required, not optional.** Invoking `npm-cli.js` with the
Node 20 binary is not enough on its own: npm spawns the package script — `jest`, `tsc`, `expo` — as a
child process that resolves `node` from `PATH`, finds v12, and dies on optional chaining with
`SyntaxError: Unexpected token .` pointing inside `node_modules`. That looks like a broken dependency
and is not one. Set this once per shell, in PowerShell:

```powershell
$n = "$env:APPDATA\nvm\v20.19.4"
$env:PATH = "$n;$env:PATH"
node --version   # must print v20.19.4 before going any further
```

| Gate | Command (with `$n` set and `PATH` prepended as above) |
| ---- | ------- |
| `types` | `& "$n\node.exe" node_modules/typescript/bin/tsc --noEmit` — zero errors |
| `test` | `& "$n\node.exe" "$n\node_modules\npm\bin\npm-cli.js" test -- --watchAll=false` — every test green |
| `full` | `types` then `test` — both must pass |
| `commit` | `& "C:\Program Files\LibreOffice\program\python.exe" ..\backend\.claude\skills\tlc-spec-driven\scripts\check_commit.py --message "<msg>"` |
| `web` | `& "$n\node.exe" "$n\node_modules\npm\bin\npm-cli.js" run web` renders in a browser with no red box and no console error |

`full` subsumes `types` and `test`; a task gated `full` does not repeat them.

The skill's validators run on LibreOffice's bundled CPython 3.10.19 at
`C:\Program Files\LibreOffice\program\python.exe`. The `python` and `python3` names on PATH are
Microsoft Store stubs and do not work.

---

## Test Coverage Matrix

Which layer proves what. A task's `Tests` field must agree with this table.

| Layer | What it proves | Requirements |
| ----- | -------------- | ------------ |
| Pure functions — `money`, `dates`, mappers, label maps | Every branch, with **literal** expected values. Never `Intl.NumberFormat(...)` recomputed in the assertion — that mirrors the implementation instead of pinning it (lesson L-010) | CAT-01, INC-01, REC-02, UX-01 |
| `httpClient` — Jest with mocked `fetch` | Bearer header attached, `Accept-Language` sent, 400 → `ApiError` carrying the API's messages, 401 → `UnauthorizedError`, network rejection → `NetworkError`, 204 → null | AUTH-03, UX-02 |
| Query / mutation hooks — RNTL `renderHook` + a test `QueryClient` | The exact request payload sent, and **which query keys are invalidated**. A mutation test that only asserts success proves nothing about the screen refreshing | INC-03, EXP-03, REC-03, CAT-02 |
| Screens — React Native Testing Library | Loading, empty, error and data states; the fields the user actually reads (lesson L-004 — totals do not cover pass-through fields); what a press sends | every requirement |
| Route guard — RNTL | Which route group renders for each session status, including `loading` | AUTH-02 |
| Scaffold, configuration and documentation — T1, T3, T47 | **none, deliberately.** A template scaffold, a `tsconfig`, an alias mapping and a README carry no behaviour to assert. Their correctness is structural: if the alias or the strict flags were wrong, every task after them fails its `types` gate, and if the README were wrong T48 would fail following it. A test here would assert that a config file contains the value it contains | — |
| Rendering on iOS / Android | **Nothing.** No emulator is available. `web` is the only rendering gate the agent can run | — |

---

## Execution Plan

| Phase | Theme | Tasks | Batch |
| ----- | ----- | ----- | ----- |
| 0 | Backend prerequisites (commits land in `backend/`) | T46, T49 | 1 |
| 1 | Project scaffold and pure helpers | T1–T5 | 1 |
| 2 | Shared kernel: http, session, keys | T6–T10 | 2 |
| 3 | Shared UI primitives | T11–T14 | 2 |
| 4 | Authentication and the route guard | T15–T19 | 3 |
| 5 | Catalogue: people, categories, accounts | T20–T24 | 4 |
| 6 | Income | T25–T30 | 5 |
| 7 | Expenses and installment plans | T31–T35 | 6 |
| 8 | Recurring bills | T36–T41 | 7 |
| 9 | Dashboard and navigation shell | T42–T45 | 8 |
| 10 | Documentation and web check | T47, T48 | 8 |

**Phase 0 comes first because T39 depends on T49.** Correcting a recurring payment needs the payment's
id, which the monthly line does not currently carry; adding it after Phase 8 would mean building the
correction screen against a response that cannot support it.

---

## Task Breakdown

### Phase 0: Backend prerequisites

Both tasks change `backend/` and commit **in that repository**, on its `feature/expense-tracking`
branch. Neither touches income code — backend decision AD-006 still holds.

No intra-phase dependencies: T46 and T49 are independent.

#### T46: Allow the Expo web origin through CORS ✅

**Where**: `backend/src/Balance.Api/Program.cs`
**What**: Add the Expo web dev origin to the existing named `FrontendDevServer` policy, keeping the Vite origin. Still no `AllowAnyOrigin`. Device builds need no CORS — React Native is not a browser and does not enforce it.
**Depends on**: none
**Requirement**: DASH-01
**Tests**: the backend's own suite must stay green — 349 passed, 0 failed — proving the pipeline change broke nothing
**Gate**: `test` (run in `backend/`: `dotnet test Balance.sln --nologo`)
**Status**: ✅ Complete. `WithOrigins("http://localhost:5173", "http://localhost:8081")` on the `FrontendDevServer` policy; no `AllowAnyOrigin`. Gate: 349 passed, 0 failed (59 Validators + 174 UseCases + 116 WebApi), build 0 errors 0 warnings. Code committed in `backend/` on `feature/expense-tracking`; this spec record travels in the next `mobile/` commit (T1).

#### T49: Expose the payment id on the monthly recurring line ✅

**Where**: `backend/src/Balance.Communication/Responses/ResponseMonthlyExpenseJson.cs`
**What**: Add a nullable `PaymentId` to `ResponseRecurringExpenseLineJson`, populated in `GetMonthlyExpenseUseCase` from the month's payment and null when none exists. Without it, `PUT /api/recurring-expense/payment/{id}` is unreachable from a monthly line, so a bill paid in a previous app session can never be corrected.
**Depends on**: none
**Requirement**: REC-03
**Tests**: backend use case + endpoint layers — a month with a payment returning that payment's exact id, and a month without one returning null. Assert the id **value**, not merely that the field exists (backend lesson L-004: this is precisely how a wrong `dueDay` shipped)
**Gate**: `test` (run in `backend/`: `dotnet test Balance.sln --nologo`)
**Status**: ✅ Complete. `Guid? PaymentId` on `ResponseRecurringExpenseLineJson`, set from `payment?.Id` in `GetMonthlyExpenseUseCase.BuildRecurringLine`. Three tests assert the id **value**: `A_Paid_Line_Carries_The_Id_Of_That_Months_Payment` and `An_Unpaid_Line_Carries_A_Null_Payment_Id` (use case), `A_Recurring_Line_Reports_The_Id_Of_The_Payment_Recorded_For_That_Month` (endpoint, both branches over the round trip). L-004 discrimination check run: forcing `PaymentId = null` failed one test at each layer, then reverted. Gate: 352 passed, 0 failed (was 349), build 0 errors 0 warnings. AD-006 held — `git diff --name-only main..HEAD | grep -i income` is empty. Code committed in `backend/`; this spec record travels in the next `mobile/` commit (T1).

---

### Phase 1: Project scaffold and pure helpers

```
T1 -> T2
T1 -> T3
T2 -> T4
T3 -> T4
T2 -> T5
T3 -> T5
```

#### T1: Scaffold the Expo TypeScript project ✅

**Where**: `mobile/`
**What**: `create-expo-app` with the TypeScript template, run on the NVM Node 20 binary. Add a React Native `.gitignore` (`node_modules`, `.expo`, `dist`, `*.log`, `.env*.local`). Record the exact Expo SDK and React Native versions produced, in this task's status line.
**Depends on**: none
**Requirement**: AUTH-01
**Tests**: none yet — the test runner is T2. The scaffold is proved by `types` compiling the template
**Gate**: `types`
**Status**: ✅ Complete. `create-expo-app@latest --template default` (the TypeScript + Expo Router template the design's `app/` tree assumes). **Expo SDK 57.0.12, React Native 0.86.2, React 19.2.3, TypeScript 6.0.3, expo-router 57.0.12** — one minor line above the spec's SDK 56 / RN 0.85 guess, which was marked unconfirmed. Scaffolded into a temp directory and moved in, since `mobile/` already held `.git/` and `.specs/`; both untouched. `.gitignore` verified with `git check-ignore` for `node_modules`, `.expo/`, `dist/`, `*.log` (added) and `.env*.local`. Gate: `tsc --noEmit` exit 0.

Deviations, all recorded rather than silent:
- SDK 57's template puts routes in `src/app/`; the design's tree puts them at `app/`. Routes were placed at root `app/` to match the design — leaving both would make Expo Router see two app directories.
- The template's demo content (`src/components`, `src/constants`, `src/hooks`, `global.css`, the demo tabs routes, `scripts/reset-project.js` and its npm script) was dropped, which is what the template's own `reset-project` exists to do. `app/_layout.tsx` and `app/index.tsx` are the blank placeholders that reset produces. **T18 replaces `app/_layout.tsx` and must delete `app/index.tsx`**, which would otherwise collide with T43's `app/(app)/index.tsx`.
- The template's `.claude/settings.json`, `CLAUDE.md` and `AGENTS.md` were not installed: agent configuration is outside this task's scope. `LICENSE` and the template `README.md` were also left out; T47 writes the README.

This commit also carries the Phase 0 spec records for T46 and T49, whose code landed in the `backend/` repo.

#### T2: Configure Jest and React Native Testing Library ✅

**Where**: `mobile/jest.config.js`
**What**: `jest-expo` preset, `@testing-library/react-native`, `transformIgnorePatterns` for the RN stack, and a `test` script. Add one trivial passing test so a green run is observable.
**Depends on**: T1
**Requirement**: UX-01
**Tests**: the harness itself — a placeholder test proving the runner executes
**Gate**: `test`
**Status**: ✅ Complete. `jest.config.js` on the `jest-expo` preset with the RN `transformIgnorePatterns`; `jest ~29.7.0`, `jest-expo ~57.0.4`, `@testing-library/react-native ^13.3.3`, `react-test-renderer 19.2.3`, `@types/jest ^29`. `"test": "jest"` script added. `__tests__/harness.test.tsx` renders a `<Text>` and queries it through RNTL, so it proves the transform, the RN environment and the queries rather than asserting a tautology. Gate: `npm test -- --watchAll=false` → 1 passed, 0 failed.

Two notes: `react-test-renderer` is pinned to `19.2.3` to match the scaffold's exact React, since the latest (`19.2.8`) demands `react@^19.2.8` and npm refused the tree — resolved by matching versions, not by `--legacy-peer-deps`. And `"types": ["jest", "node"]` was added to `tsconfig.json` (T3's file) because TypeScript 6 does not pick up `@types/jest` implicitly here; without it the `types` gate breaks the moment a test file exists.

#### T3: Set strict TypeScript and path aliases ✅

**Where**: `mobile/tsconfig.json`
**What**: `strict: true`, `noUncheckedIndexedAccess`, and `@/*` → `src/*` mirrored in `babel.config.js` (module-resolver) and `jest.config.js` `moduleNameMapper`, so the alias resolves in all three.
**Depends on**: T1
**Requirement**: UX-01
**Tests**: none — configuration. Proved when T4 imports through the alias and both gates pass
**Gate**: `types`
**Status**: ✅ Complete. `strict: true` (already from the scaffold) plus `noUncheckedIndexedAccess: true` in `tsconfig.json`. `@/*` → `src/*` now resolves in all three: `tsconfig.json` `paths`, a new `babel.config.js` using `babel-plugin-module-resolver`, and `moduleNameMapper` in `jest.config.js`. The scaffold's second alias `@/assets/*` → `assets/*` is mirrored in the same three so the lists cannot drift; it is listed first in babel and jest, since `^@/(.*)$` would otherwise swallow it. `babel.config.js` keeps `babel-preset-expo` as its only preset, which is what wires reanimated and worklets. Gate: `tsc --noEmit` exit 0; tests still 1 passed, 0 failed. The alias itself is proved by T4, whose test imports through `@/shared/lib/money`.

#### T4: Add the money helpers ✅

**Where**: `mobile/src/shared/lib/money.ts`
**What**: `formatMoney(number): string` in pt-BR, and `parseMoneyInput(string): number | null` accepting `1234,56` and `1234.56` and rejecting junk.
**Depends on**: T2, T3
**Requirement**: CAT-01, UX-01
**Tests**: pure-function layer — **literal** expected strings (`formatMoney(1234.56)` → `'R$ 1.234,56'`), zero, negative, a value with one decimal place, and each rejected input returning null. Assertions must not call `Intl.NumberFormat` themselves (lesson L-010)
**Gate**: `full`
**Status**: ✅ Complete. `src/shared/lib/money.ts` + `money.test.ts`, 10 tests, every expected value a literal and no `Intl` call anywhere in the test file. Covered: `formatMoney(1234.56)` → `'R$ 1.234,56'`, `0` → `'R$ 0,00'`, `-45.9` → `'-R$ 45,90'` (negative, not absolute), `1234.5` → `'R$ 1.234,50'`; `parseMoneyInput` accepting both separators and returning null for an empty string, whitespace, letters, a currency prefix, two separators and a bare separator. The test imports through `@/shared/lib/money`, which is what proves T3's alias resolves under Jest. Gate: `tsc` exit 0, 13 passed 0 failed.

Formatting is hand-rolled rather than `Intl.NumberFormat`: Hermes does not guarantee the ICU data `pt-BR` currency needs, and ICU separates `R$` from the digits with a non-breaking space, which would differ from the pinned literal by an invisible character.

⚠️ **Spec-precision gap**: the task names exactly two accepted inputs, `1234,56` and `1234.56`. A pt-BR grouped string such as `1.234,56` therefore parses to null. If a user is expected to be able to type the thousands separator, the spec has to say so and this needs a follow-up task.

#### T5: Add the date helpers ✅

**Where**: `mobile/src/shared/lib/dates.ts`
**What**: `toApiDate` / `fromApiDate` operating on `YYYY-MM-DD` **as strings**, plus `monthLabel(year, month)` and `shiftMonth(year, month, delta)` crossing year boundaries.
**Depends on**: T2, T3
**Requirement**: EXP-02, DASH-01
**Tests**: pure-function layer — a round trip that does not shift a day, `shiftMonth` across December→January and January→December, and a test run under a non-UTC `TZ` proving no timezone drift
**Gate**: `full`
**Status**: ✅ Complete — `tsc --noEmit` clean, 28 tests passed, 0 failed. The module never constructs a `Date`; it works on strings and integers, which is what makes the drift structurally impossible rather than merely tested for.

**The timezone test needed two corrections before it proved anything.**

First, `TZ` was being assigned in a `beforeAll`. Jest sandboxes `process.env`, so that assignment never reaches V8 and the timezone silently stays put — the test would have passed under UTC while claiming to run under UTC-11. It moved to `jest.globalSetup.js`, which runs in the real Jest process before any worker forks. A guard assertion on `getTimezoneOffset()` now fails loudly if the offset ever stops applying; it is what caught the original bug.

Second, the run was pinned to two offsets via `describe.each`, which `globalSetup` cannot do — one offset per run is Jest's limit without a second project config. Reduced to Pacific/Midway (UTC-11), the direction that actually breaks `DateOnly`: `new Date('2026-08-21')` parses as UTC midnight and reads back as the 20th.

A third assertion was added that neither correction covered: `new Date('2026-08-21').getDate()` is asserted to be **20**, proving the hazard is genuinely reachable in this environment. Without it, the module's assertions would pass just as happily under UTC — where nothing can go wrong — and would not distinguish an implementation that avoids `Date` from one that got lucky.

---

### Phase 2: Shared kernel

```
T7 -> T8
T6 -> T9
T8 -> T9
T9 -> T10
```

T6 and T7 have no intra-phase dependency and may be done in either order.

#### T6: Add the API error types ✅

**Where**: `mobile/src/shared/api/ApiError.ts`
**What**: `ApiError` carrying `messages: string[]`, plus `UnauthorizedError` and `NetworkError`. Screens branch on type, never on a status code.
**Depends on**: none
**Requirement**: UX-02
**Tests**: pure-function layer — each type is distinguishable by `instanceof` and carries its messages
**Gate**: `full`
**Status**: ✅ Complete. `src/shared/api/ApiError.ts` + `ApiError.test.ts`, 10 tests. Every pair of types is asserted in **both** directions — `new NetworkError() instanceof ApiError` is pinned to `false`, not merely `new NetworkError() instanceof NetworkError` to `true` — because a single shared type would satisfy the one-directional form while making spec UX AC5 unreachable. `ApiError.messages` is asserted with `toEqual` on a two-element array, so order and content are both pinned. Gate: `tsc` exit 0, 38 passed 0 failed (was 28).

Each constructor calls `Object.setPrototypeOf`. A class extending a built-in loses its prototype when downlevelled, and every `instanceof` in the app would then collapse to the same branch — the exact confusion these three types exist to prevent.

#### T7: Add token storage with a web fallback ✅

**Where**: `mobile/src/shared/lib/tokenStorage.ts`
**What**: `getToken` / `setToken` / `clearToken` over `expo-secure-store` on native and `localStorage` on web, where SecureStore has no implementation and would throw. The platform split lives only here.
**Depends on**: none
**Requirement**: AUTH-01
**Tests**: pure-function layer — both branches with `Platform.OS` mocked, including `clearToken` actually removing the value
**Gate**: `full`
**Status**: ✅ Complete. `src/shared/lib/tokenStorage.ts` + `tokenStorage.test.ts`, 9 tests, both platform branches. `expo-secure-store ~57.0.1` installed through `expo install`, which also registered its config plugin in `app.json`. Gate: `tsc` exit 0, 47 passed 0 failed (was 38).

`Platform.OS` is swapped with `Object.defineProperty`, and the web fake keeps a backing map rather than returning canned values. That combination is what makes the branch test discriminating: if the platform swap silently failed, the web tests would fall through to the SecureStore mocks and read `undefined` instead of the token they stored.

`clearToken` is pinned twice per platform — a read afterwards returning **null**, and the removal call itself asserted with `setItemAsync` proved not to have been called. An implementation writing `''` would pass a weaker test while leaving a stored token that reads as an empty string.

The web build falls back to `localStorage`, which is not a secure store. It is the browser's only option and the web build is a development surface, not a shipped one.

#### T8: Add the session store

**Where**: `mobile/src/shared/lib/sessionStore.ts`
**What**: Zustand store `{ token, name, status: 'loading' | 'signedIn' | 'signedOut' }` with `restore`, `signIn`, `signOut`. `status` starts `loading` so the guard cannot flash sign-in during cold start.
**Depends on**: T7
**Requirement**: AUTH-01, AUTH-02
**Tests**: hook layer — `restore` with and without a stored token reaching the right status, `signIn` persisting, `signOut` clearing storage
**Gate**: `full`

#### T9: Add the http client

**Where**: `mobile/src/shared/api/httpClient.ts`
**What**: `request<T>(method, path, body?)` reading the base URL from `EXPO_PUBLIC_API_URL`, attaching the bearer token and `Accept-Language: pt-BR`, mapping 400 → `ApiError`, 401 → `UnauthorizedError`, a `fetch` rejection → `NetworkError`, and 204 → null.
**Depends on**: T6, T8
**Requirement**: AUTH-03, UX-02
**Tests**: httpClient layer — every mapping above with a mocked `fetch`, the header present when a token exists and absent when it does not, and the API's `errorMessages` reaching `ApiError.messages` intact
**Gate**: `full`

#### T10: Add query keys and the QueryClient provider

**Where**: `mobile/src/shared/api/queryKeys.ts`
**What**: One factory per resource — `qk.dashboard(y, m)`, `qk.incomeMonth(y, m)`, `qk.expenseMonth(y, m)`, `qk.people()`, `qk.categories()`, `qk.accounts()` — plus a `QueryClientProvider` wrapper and a test helper that builds a client with retries off.
**Depends on**: T9
**Requirement**: INC-03, EXP-03
**Tests**: pure-function layer — each factory returns a stable key for the same input and a different key for a different month, which is what makes invalidation land
**Gate**: `full`

---

### Phase 3: Shared UI primitives

No intra-phase dependencies: T11–T14 depend only on Phases 1 and 2 and may be done in any order.

#### T11: Add the screen state primitives

**Where**: `mobile/src/shared/ui/states.tsx`
**What**: `Screen`, `Loading`, `EmptyState(message)` and `ErrorState(message, onRetry)`. Every list screen is built from these four, so UX-01 is structural rather than remembered per screen.
**Depends on**: none
**Requirement**: UX-01
**Tests**: screen layer — each renders its message, and `ErrorState` calls `onRetry` when pressed
**Gate**: `full`

#### T12: Add the money and status display components

**Where**: `mobile/src/shared/ui/Money.tsx`
**What**: `Money` rendering a formatted value, negative styled distinctly; `StatusBadge` taking a label and tone. The income and expense label maps live in their own features, not here.
**Depends on**: none
**Requirement**: DASH-02, INC-01
**Tests**: screen layer — a positive, a negative and a zero value render their literal expected strings; the negative renders as negative, not as an absolute value (spec DASH AC5)
**Gate**: `full`

#### T13: Add the form primitives

**Where**: `mobile/src/shared/ui/form.tsx`
**What**: `Field` (label, value, error), `Picker` (options, selected, onChange) and `SubmitButton` disabled while a mutation is pending.
**Depends on**: none
**Requirement**: UX-02, CAT-02
**Tests**: screen layer — `Field` shows its error text, `Picker` reports the chosen option, and `SubmitButton` cannot be pressed twice while pending (spec UX AC4)
**Gate**: `full`

#### T14: Add the month navigator

**Where**: `mobile/src/shared/ui/MonthNavigator.tsx`
**What**: Shows the current month in Portuguese with previous and next controls, built on `shiftMonth`.
**Depends on**: none
**Requirement**: DASH-01
**Tests**: screen layer — the label for a given month, and pressing each control reporting the right target month including across a year boundary
**Gate**: `full`

---

### Phase 4: Authentication and the route guard

```
T15 -> T16
T15 -> T17
T16 -> T18
T17 -> T18
T18 -> T19
```

#### T15: Add the auth API hooks

**Where**: `mobile/src/features/auth/api/useAuth.ts`
**What**: `useSignIn` posting to `/login` and `useSignUp` posting to `/user`, each storing the returned token through the session store on success.
**Depends on**: none
**Requirement**: AUTH-01
**Tests**: hook layer — the exact payload posted, and the session store reaching `signedIn` with the returned token on success and staying `signedOut` on failure
**Gate**: `full`

#### T16: Add the sign-in screen

**Where**: `mobile/app/(auth)/sign-in.tsx`
**What**: Email and password fields, a submit that calls `useSignIn`, and the API's messages rendered on failure with the entered email preserved.
**Depends on**: T15
**Requirement**: AUTH-01
**Tests**: screen layer — a successful submit sending the typed credentials, a failure rendering the API's own message text, and the email still present afterwards (spec AUTH AC7)
**Gate**: `full`

#### T17: Add the sign-up screen

**Where**: `mobile/app/(auth)/sign-up.tsx`
**What**: Name, email and password fields calling `useSignUp`, and a link back to sign-in.
**Depends on**: T15
**Requirement**: AUTH-01
**Tests**: screen layer — the payload sent on submit and the API's validation messages rendered on rejection
**Gate**: `full`

#### T18: Add the root layout and route guard

**Where**: `mobile/app/_layout.tsx`
**What**: `QueryClientProvider`, session `restore` on mount, and a guard rendering `(auth)` when signed out and `(app)` when signed in. While `status` is `loading` it renders a splash, never the sign-in screen.
**Depends on**: T16, T17
**Requirement**: AUTH-02
**Tests**: route-guard layer — one test per session status, including that `loading` renders neither group; a stored token reaching the app group without a credential prompt (spec AUTH AC3)
**Gate**: `full`

#### T19: Add sign-out and session expiry handling

**Where**: `mobile/src/features/auth/api/useSignOut.ts`
**What**: `signOut` clearing the token and calling `queryClient.clear()`, plus wiring `UnauthorizedError` from any request to the same path.
**Depends on**: T18
**Requirement**: AUTH-03
**Tests**: hook layer — sign-out emptying the query cache so a second account cannot read the first's data, and a 401 from an authorised call driving the session to `signedOut` (spec AUTH AC5, AC6)
**Gate**: `full`

---

### Phase 5: Catalogue

```
T20 -> T21
T20 -> T22
T20 -> T23
T21 -> T24
T22 -> T24
T23 -> T24
```

#### T20: Add the catalogue API hooks

**Where**: `mobile/src/features/catalogue/api/useCatalogue.ts`
**What**: Queries for people, categories and accounts, and mutations creating each, every mutation invalidating its own list key.
**Depends on**: none
**Requirement**: CAT-01, CAT-02
**Tests**: hook layer — each mutation's payload, and that it invalidates the matching key so the list refreshes without a manual reload (spec CAT AC2)
**Gate**: `full`

#### T21: Add the people screen

**Where**: `mobile/app/(app)/catalogue/people.tsx`
**What**: Lists People with the four states, and a form creating one.
**Depends on**: T20
**Requirement**: CAT-01, CAT-02
**Tests**: screen layer — loading, empty, error and data states, and a create appearing in the list
**Gate**: `full`

#### T22: Add the categories screen

**Where**: `mobile/app/(app)/catalogue/categories.tsx`
**What**: Lists Categories showing the priority as Essencial, Importante or Supérfluo, and a form creating one.
**Depends on**: T20
**Requirement**: CAT-01, CAT-02
**Tests**: screen layer — all three priority labels rendered from their integers, and two categories with the same name both listed (spec edge case)
**Gate**: `full`

#### T23: Add the accounts screen

**Where**: `mobile/app/(app)/catalogue/accounts.tsx`
**What**: Lists Accounts and creates one, with closing day, due day and limit all optional.
**Depends on**: T20
**Requirement**: CAT-01, CAT-02
**Tests**: screen layer — an account created with all three optional fields empty succeeding and rendering without "NaN" or "undefined" (spec CAT AC4)
**Gate**: `full`

#### T24: Add the catalogue navigation

**Where**: `mobile/app/(app)/catalogue/_layout.tsx`
**What**: Groups the three catalogue screens under one route with tabs or a menu.
**Depends on**: T21, T22, T23
**Requirement**: CAT-01
**Tests**: screen layer — each of the three destinations reachable
**Gate**: `full`

---

### Phase 6: Income

```
T25 -> T26
T26 -> T27
T26 -> T28
T26 -> T29
T26 -> T30
```

#### T25: Add the income model

**Where**: `mobile/src/features/income/model/income.ts`
**What**: Types mirroring the API contracts, plus the `IncomeStatus` map — Pendente, Recebido, Divergente — kept separate from the expense map even though the integers coincide.
**Depends on**: none
**Requirement**: INC-01
**Tests**: pure-function layer — every status integer mapping to its literal label, including a fixture per branch (lesson L-005)
**Gate**: `full`

#### T26: Add the income API hooks

**Where**: `mobile/src/features/income/api/useIncome.ts`
**What**: `useIncomeMonth`, `useRegisterIncomeSource`, `useRegisterIncomePayment`, `useChangeIncomeValue`. Payment and value-change invalidate `incomeMonth` and `dashboard` for the reference month.
**Depends on**: T25
**Requirement**: INC-02, INC-03
**Tests**: hook layer — each payload, a recurring source sending amount and expected day while a variable source sends neither (spec INC AC3, AC4), and the invalidated keys after a payment
**Gate**: `full`

#### T27: Add the income month screen

**Where**: `mobile/app/(app)/income/index.tsx`
**What**: One line per source with expected, received and status, with month navigation and the four states.
**Depends on**: T26
**Requirement**: INC-01
**Tests**: screen layer — expected, received **and** the status label asserted per line, not just the totals (lesson L-004); a variable source rendering an absent expected rather than zero
**Gate**: `full`

#### T28: Add the register income source screen

**Where**: `mobile/app/(app)/income/new.tsx`
**What**: A form switching between Recurring and Variable, hiding amount and expected day for Variable.
**Depends on**: T26
**Requirement**: INC-02
**Tests**: screen layer — the payload for each type, and the API's messages rendered on rejection
**Gate**: `full`

#### T29: Add the record income payment screen

**Where**: `mobile/app/(app)/income/payment.tsx`
**What**: A form with the reference month separate from the payment date, defaulting the reference month to the one being viewed.
**Depends on**: T26
**Requirement**: INC-03
**Tests**: screen layer — a payment dated in one month for a different reference month sending both distinctly (spec INC AC5), and the month refreshing afterwards
**Gate**: `full`

#### T30: Add the change income value screen

**Where**: `mobile/app/(app)/income/change-value.tsx`
**What**: A form sending the new amount, expected day, validity start and change reason.
**Depends on**: T26
**Requirement**: INC-03
**Tests**: screen layer — the full payload including the change reason, and the API's message when the reason is empty
**Gate**: `full`

---

### Phase 7: Expenses and installment plans

```
T31 -> T32
T32 -> T33
T32 -> T34
T32 -> T35
```

#### T31: Add the expense model

**Where**: `mobile/src/features/expenses/model/expense.ts`
**What**: Types for the monthly expense response, plus `ExpenseStatus` (Pendente, Pago, Divergente), `ExpenseType` (Crédito, Débito, Pix) and `ExpensePriority` maps.
**Depends on**: none
**Requirement**: EXP-01
**Tests**: pure-function layer — every integer of all three maps to its literal label, one fixture per branch, and `Paid` reading Pago rather than Recebido
**Gate**: `full`

#### T32: Add the expense API hooks

**Where**: `mobile/src/features/expenses/api/useExpenses.ts`
**What**: `useExpenseMonth`, `useRegisterExpense`, `useRegisterInstallmentPlan`. Registering invalidates the month **the API returned**, not the one on screen.
**Depends on**: T31
**Requirement**: EXP-02, EXP-03
**Tests**: hook layer — a registration whose response carries a competence month different from the viewed one invalidating the returned month's keys, not the viewed month's. A test that invalidates the viewed month would pass under the bug this exists to prevent
**Gate**: `full`

#### T33: Add the expense month screen

**Where**: `mobile/app/(app)/expenses/index.tsx`
**What**: Variable expenses and recurring bills as two sections, with month navigation and the four states.
**Depends on**: T32
**Requirement**: EXP-01
**Tests**: screen layer — both sections; a recurring line marked provisional when `isEstimate` and unpaid, and showing the real value once paid; the due day asserted per line (lesson L-004 — this exact field shipped wrong in the backend)
**Gate**: `full`

#### T34: Add the register expense screen

**Where**: `mobile/app/(app)/expenses/new.tsx`
**What**: Name, person, type, amount, category, account, date, and an optional competence-month override. No competence month is computed on the client.
**Depends on**: T32
**Requirement**: EXP-02, EXP-03
**Tests**: screen layer — the payload sending `date` with a null competence month by default; the override sent when chosen; and a response whose competence month differs from the viewed month telling the user where it landed (spec EXP AC6)
**Gate**: `full`

#### T35: Add the installment plan screen

**Where**: `mobile/app/(app)/expenses/installment-plan.tsx`
**What**: A form for total, count and start date, showing the generated installments and their amounts on success.
**Depends on**: T32
**Requirement**: INST-01
**Tests**: screen layer — a 100,00 in 3 response rendering 33,33 / 33,33 / 33,34 as literal strings, and the API's message when the count is rejected
**Gate**: `full`

---

### Phase 8: Recurring bills

```
T36 -> T37
T36 -> T38
T36 -> T39
T36 -> T40
T36 -> T41
T37 -> T41
```

#### T36: Add the recurring bill API hooks

**Where**: `mobile/src/features/recurring/api/useRecurring.ts`
**What**: `useRegisterRecurringExpense`, `useRegisterRecurringPayment`, `useUpdateRecurringPayment`, `useChangeRecurringValue`, `useArchiveRecurringExpense`. Archiving invalidates every month, since it changes past and future alike.
**Depends on**: none
**Requirement**: REC-01, REC-03, REC-04
**Tests**: hook layer — each payload, the update sending only amount, date, notes and account (spec REC AC5), and archiving invalidating more than the current month
**Gate**: `full`

#### T37: Add the recurring bills list screen

**Where**: `mobile/app/(app)/recurring/index.tsx`
**What**: Lists bills with their due day, estimate flag and archived state.
**Depends on**: T36
**Requirement**: REC-01, REC-02
**Tests**: screen layer — the due day and estimate flag asserted per row, and the four states
**Gate**: `full`

#### T38: Add the register recurring bill screen

**Where**: `mobile/app/(app)/recurring/new.tsx`
**What**: Name, person, category, account, due day, base amount and the estimate toggle.
**Depends on**: T36
**Requirement**: REC-01
**Tests**: screen layer — the payload including `isEstimate` in both positions, and the API's message when the due day is out of range
**Gate**: `full`

#### T39: Add the record and correct payment screen

**Where**: `mobile/app/(app)/recurring/payment.tsx`
**What**: One screen that POSTs a new payment when the month's line has a null `paymentId` and PUTs to that id when it does not, so the user never meets `PAYMENT_ALREADY_RECORDED` as a dead end. The id comes from the monthly line (T49), so correction works after an app restart.
**Depends on**: T36
**Requirement**: REC-03
**Tests**: screen layer — a line with a null `paymentId` sending POST, and a line carrying one sending PUT to **that exact id** (spec REC AC4); the month refreshing afterwards
**Gate**: `full`

#### T40: Add the change recurring value screen

**Where**: `mobile/app/(app)/recurring/change-value.tsx`
**What**: A form sending the new amount, validity start and change reason.
**Depends on**: T36
**Requirement**: REC-04
**Tests**: screen layer — the payload, and the API's message when the reason is empty or the validity start is not later
**Gate**: `full`

#### T41: Add archive and unarchive

**Where**: `mobile/src/features/recurring/ui/ArchiveToggle.tsx`
**What**: A control archiving and unarchiving a bill from the list, confirming before archiving.
**Depends on**: T36, T37
**Requirement**: REC-04
**Tests**: screen layer — archiving removing the bill from the month view and unarchiving restoring it with its recorded payment intact (spec REC AC7, AC8)
**Gate**: `full`

---

### Phase 9: Dashboard and navigation shell

```
T42 -> T43
T43 -> T44
T44 -> T45
```

#### T42: Add the dashboard API hook

**Where**: `mobile/src/features/dashboard/api/useDashboard.ts`
**What**: `useDashboard(year, month)` reading `GET /api/dashboard/{y}/{m}`.
**Depends on**: none
**Requirement**: DASH-01
**Tests**: hook layer — the requested path for a given month and the key it registers under
**Gate**: `full`

#### T43: Add the dashboard screen

**Where**: `mobile/app/(app)/index.tsx`
**What**: Income received, committed expense and balance, plus four groups — recurring income, variable income, recurring expenses, variable expenses — with month navigation.
**Depends on**: T42
**Requirement**: DASH-01, DASH-02
**Tests**: screen layer — the three totals as literal strings, all four groups present, a negative balance rendered as negative (spec DASH AC5), and an empty month showing zeroed totals rather than a blank screen
**Gate**: `full`

#### T44: Add the tab navigation shell

**Where**: `mobile/app/(app)/_layout.tsx`
**What**: Tabs for Dashboard, Receitas, Despesas, Recorrentes and Catálogo.
**Depends on**: T43
**Requirement**: DASH-01
**Tests**: route-guard layer — every tab reachable and the dashboard being the initial route
**Gate**: `full`

#### T45: Sweep the loading, empty and error states

**Where**: `mobile/src/shared/ui/states.tsx`
**What**: Audit every list and form screen against UX-01 and UX-02: first-load indicator, retryable error, explanatory empty state, submit disabled while pending, and an unreachable API reading as connectivity rather than validation.
**Depends on**: T44
**Requirement**: UX-01, UX-02
**Tests**: screen layer — a `NetworkError` rendering a connectivity message distinct from a validation message (spec UX AC5), and one screen per state family
**Gate**: `full`

---

### Phase 10: Documentation and web check

```
T47 -> T48
```

#### T47: Document configuration and running

**Where**: `mobile/README.md`
**What**: `EXPO_PUBLIC_API_URL` and why a physical device needs the machine's LAN IP rather than `localhost`; the NVM Node 20 invocation; how to run tests, web and Expo Go; and the backend version this app requires — it depends on `paymentId` from T49, so an older API breaks payment correction.
**Depends on**: none
**Requirement**: UX-02
**Tests**: none — documentation. Its accuracy is checked by following it in T48
**Gate**: `types`

#### T48: Verify the app in the browser against the seeded database

**Where**: `mobile/`
**What**: Start the API and `expo start --web`, sign in with the seeded account, and read the dashboard, the income month and the expense month for August and September 2026. Confirm the figures match what the API returns and that no console error appears. Record what was seen in the status line.
**Depends on**: T46, T47
**Requirement**: DASH-01, INC-01, EXP-01
**Tests**: the `web` gate is this task; automated coverage of the data itself already exists from Phases 6–9
**Gate**: `web`

---

## Requirement → Task Map

| Requirement | Tasks |
| ----------- | ----- |
| AUTH-01 | T1, T7, T8, T15, T16, T17 |
| AUTH-02 | T8, T18 |
| AUTH-03 | T9, T19 |
| CAT-01 | T4, T20, T21, T22, T23, T24 |
| CAT-02 | T13, T20, T21, T22, T23 |
| DASH-01 | T5, T14, T42, T43, T44, T46, T48 |
| DASH-02 | T12, T43 |
| INC-01 | T12, T25, T27, T48 |
| INC-02 | T26, T28 |
| INC-03 | T10, T26, T29, T30 |
| EXP-01 | T31, T33, T48 |
| EXP-02 | T5, T32, T34 |
| EXP-03 | T10, T32, T34 |
| REC-01 | T36, T37, T38 |
| REC-02 | T37, T33 |
| REC-03 | T36, T39, T49 |
| REC-04 | T36, T40, T41 |
| INST-01 | T35 |
| UX-01 | T2, T3, T4, T11, T45 |
| UX-02 | T6, T9, T13, T45, T47 |

All 20 requirements are mapped.
