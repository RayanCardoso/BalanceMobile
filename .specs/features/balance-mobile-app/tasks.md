# Balance Mobile App Tasks

**Spec**: `.specs/features/balance-mobile-app/spec.md`
**Design**: `.specs/features/balance-mobile-app/design.md`
**Status**: Awaiting approval

51 tasks across 11 phases. Every task ends in one atomic commit.

T50 was added after Batch 3 and T44 was amended; both are annotated where they appear. T51 was added
during Batch 7, discovered while implementing T37; it is annotated in place ahead of T37, which now
depends on it.

Three tasks change the **backend** repository and commit there, not here: T46 and T49 in Phase 0, and
T51 ahead of T37 in Phase 8. Everything else is mobile-only.

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
| 8 | Recurring bills | T36–T41, T51 | 7 |
| 9 | Dashboard, navigation shell and sign-out | T42–T45, T50 | 8 |
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

#### T8: Add the session store ✅

**Where**: `mobile/src/shared/lib/sessionStore.ts`
**What**: Zustand store `{ token, name, status: 'loading' | 'signedIn' | 'signedOut' }` with `restore`, `signIn`, `signOut`. `status` starts `loading` so the guard cannot flash sign-in during cold start.
**Depends on**: T7
**Requirement**: AUTH-01, AUTH-02
**Tests**: hook layer — `restore` with and without a stored token reaching the right status, `signIn` persisting, `signOut` clearing storage
**Gate**: `full`
**Status**: ✅ Complete. `src/shared/lib/sessionStore.ts` + `sessionStore.test.ts`, 8 tests, `zustand ^5.0.9`. Gate: `tsc` exit 0, 55 passed 0 failed (was 47).

All three statuses are pinned, and the third one carries the weight. One test holds `getToken` unresolved, calls `restore` without awaiting, and asserts `loading` in exactly the frame the route guard renders on a cold start — then releases the promise and asserts `signedIn`. A two-state store would report `signedOut` in that frame and flash the sign-in screen at a signed-in user every start, which is spec AUTH AC3 failing.

Each test loads a fresh copy of the store through `jest.isolateModules`. Resetting the singleton with `setState` instead would make the initial-status test assert the value the test itself had just written.

`restore` does not repopulate `name`: storage holds only the token, and the name is display copy the sign-in response carries. Recorded here rather than left as a silent gap.

#### T9: Add the http client ✅

**Where**: `mobile/src/shared/api/httpClient.ts`
**What**: `request<T>(method, path, body?)` reading the base URL from `EXPO_PUBLIC_API_URL`, attaching the bearer token and `Accept-Language: pt-BR`, mapping 400 → `ApiError`, 401 → `UnauthorizedError`, a `fetch` rejection → `NetworkError`, and 204 → null.
**Depends on**: T6, T8
**Requirement**: AUTH-03, UX-02
**Tests**: httpClient layer — every mapping above with a mocked `fetch`, the header present when a token exists and absent when it does not, and the API's `errorMessages` reaching `ApiError.messages` intact
**Gate**: `full`
**Status**: ✅ Complete. `src/shared/api/httpClient.ts` + `httpClient.test.ts`, 16 tests over a mocked `fetch`. Gate: `tsc` exit 0, 71 passed 0 failed (was 55).

Two acceptance criteria live in this module and nowhere else, so both are pinned twice — once on the type produced, once on a type **not** produced:

- **AUTH AC5** — a 401 rejects with `UnauthorizedError`, and the same call is asserted **not** to reject with `ApiError`.
- **UX AC5** — a rejected `fetch` rejects with `NetworkError`, and is asserted **not** to be an `ApiError`.

The negative half is what makes them discriminating. An implementation collapsing every failure into one type passes every "an error was thrown" assertion; the two `.rejects.not.toBeInstanceOf(ApiError)` tests are what it fails.

**Discrimination sensor run.** Both branches were temporarily rewritten to `throw new ApiError([])`. Exactly four tests failed — the two positives and the two negatives — and the mutation was reverted; the suite is back to 71 passed.

Also covered: the bearer header present with a token and **absent** without one, `Accept-Language: pt-BR`, the JSON body serialised, the base URL defaulting to `http://localhost:5126/api`, each of `get` / `post` / `put` sending its own verb, a 400's `errorMessages` reaching `ApiError.messages` element for element, and 204 resolving null.

Non-400 failures (404, 500) also become `ApiError`, carrying `errorMessages` when the envelope has them and an **empty** array when it does not — the transport layer writes no user copy of its own. The generic fallback wording belongs to the screens and is T45's sweep. Recorded rather than left implicit.

#### T10: Add query keys and the QueryClient provider ✅

**Where**: `mobile/src/shared/api/queryKeys.ts`
**What**: One factory per resource — `qk.dashboard(y, m)`, `qk.incomeMonth(y, m)`, `qk.expenseMonth(y, m)`, `qk.people()`, `qk.categories()`, `qk.accounts()` — plus a `QueryClientProvider` wrapper and a test helper that builds a client with retries off.
**Depends on**: T9
**Requirement**: INC-03, EXP-03
**Tests**: pure-function layer — each factory returns a stable key for the same input and a different key for a different month, which is what makes invalidation land
**Gate**: `full`
**Status**: ✅ Complete. Three files, `@tanstack/react-query ^5.90.x`. Gate: `tsc` exit 0, 83 passed 0 failed (was 71).

- `src/shared/api/queryKeys.ts` — the six factories.
- `src/shared/api/queryClient.tsx` — `createQueryClient` and the `QueryProvider` wrapper T18 mounts at the root.
- `src/shared/api/testQueryClient.tsx` — `createTestQueryClient` with **retries off** and `createQueryWrapper` for `renderHook`. With the default retry policy a hook test asserting an error state waits through three backed-off retries, so a wrongly mapped error reads as a hanging test rather than a failing one.

`queryKeys.test.ts`, 12 tests. Each key is pinned to a **literal** array first, then the two properties invalidation actually depends on are asserted around it: the same input giving an equal key, and different inputs giving different ones. Comparing two calls is the only way to state stability, and the literals are what keep that from becoming self-referential.

`expenseMonth(2026, 8)` and `expenseMonth(2026, 9)` are asserted unequal, as are the same month across two years. A factory ignoring an argument would put every month in one cache entry, and recording an expense in August would appear to change September. The three month resources are also asserted apart from each other for one and the same month, so invalidating the dashboard cannot silently drop the income month.

`QueryProvider` and the test client carry no tests of their own: both are proved structurally from Phase 5 onwards, where every hook test renders through them and would fail immediately if either were wrong. A test here would assert that a wrapper wraps.

No intra-phase dependencies: T11–T14 depend only on Phases 1 and 2 and may be done in any order.

#### T11: Add the screen state primitives ✅

**Where**: `mobile/src/shared/ui/states.tsx`
**What**: `Screen`, `Loading`, `EmptyState(message)` and `ErrorState(message, onRetry)`. Every list screen is built from these four, so UX-01 is structural rather than remembered per screen.
**Depends on**: none
**Requirement**: UX-01
**Tests**: screen layer — each renders its message, and `ErrorState` calls `onRetry` when pressed
**Gate**: `full`
**Status**: ✅ Complete. `src/shared/ui/states.tsx` + `states.test.tsx`, 7 tests. Gate: `tsc` exit 0, 90 passed 0 failed (was 83).

Each message is asserted as the literal text the user reads. The retry is asserted by the call it makes — `onRetry` having been called exactly once — not by the control being on screen: a button rendered without its handler wired looks identical and would satisfy a presence check while leaving spec UX AC2 broken.

`ErrorState` stores no wording. Its message is a prop, so the API's own pt-BR copy reaches the screen unaltered (MAD-004); the only string this module owns is the retry label.

#### T12: Add the money and status display components ✅

**Where**: `mobile/src/shared/ui/Money.tsx`
**What**: `Money` rendering a formatted value, negative styled distinctly; `StatusBadge` taking a label and tone. The income and expense label maps live in their own features, not here.
**Depends on**: none
**Requirement**: DASH-02, INC-01
**Tests**: screen layer — a positive, a negative and a zero value render their literal expected strings; the negative renders as negative, not as an absolute value (spec DASH AC5)
**Gate**: `full`
**Status**: ✅ Complete. `src/shared/ui/Money.tsx` + `Money.test.tsx`, 7 tests, every expected string a literal and no `formatMoney` call in the test file (L-010). Gate: `tsc` exit 0, 97 passed 0 failed (was 90).

Spec DASH AC5 is pinned twice: `-45.9` renders **`-R$ 45,90`**, and `R$ 45,90` is asserted **absent** from the same render. The negative half is the discriminating one — a component dropping the sign still passes a test that only looks for the digits, and the user reads a shortfall as a surplus.

The sign lives in the text, not only in the colour. Colour is a second signal and is deliberately not asserted: pinning a hex value tests the stylesheet, not the behaviour the spec names.

`StatusBadge` takes a label and a tone and owns neither. The label maps stay with the features (T25, T31), so income's `Recebido` and expense's `Pago` cannot be retitled by a rename on the other side.

Money takes a `number`, not `number | null`. Rendering an *absent* expected amount as something other than zero is a recurring-line and variable-source concern, covered by T27 and T33 where the spec puts it.

#### T13: Add the form primitives ✅

**Where**: `mobile/src/shared/ui/form.tsx`
**What**: `Field` (label, value, error), `Picker` (options, selected, onChange) and `SubmitButton` disabled while a mutation is pending.
**Depends on**: none
**Requirement**: UX-02, CAT-02
**Tests**: screen layer — `Field` shows its error text, `Picker` reports the chosen option, and `SubmitButton` cannot be pressed twice while pending (spec UX AC4)
**Gate**: `full`
**Status**: ✅ Complete. `src/shared/ui/form.tsx` + `form.test.tsx`, 10 tests. Gate: `tsc` exit 0, 107 passed 0 failed (was 97).

**Spec UX AC4 is asserted on how many times the handler ran, never on the button reporting itself disabled.** A control that renders disabled and still forwards the press looks correct in a snapshot and sends the expense twice. Two tests: pressing twice while `pending` calls the handler **zero** times, and a stateful harness whose first press sets `pending` calls it exactly **once** after two presses.

**Discrimination sensor run.** Both protections — the `disabled` prop and the handler's own guard — were removed together. Exactly those two tests failed, reporting 2 calls where 0 and 1 were required, and the mutation was reverted; the suite is back to 107 passed.

`SubmitButton` carries both protections deliberately: the prop is what the user sees, the guard is what makes a second press unable to reach the API however it arrives.

`Field` renders an error it is handed and never produces one (MAD-001, MAD-004). The absent case is pinned with a `testID` query returning null, so "no error" is a real assertion rather than the absence of a string nobody named.

`Picker` is generic over `string | number`, and one test presses a numeric option and asserts `onChange` received `0` rather than `'0'` — the expense type is an integer enum and a stringified value would be rejected by the API. Its options are keyed by value **and index**, because two categories may legitimately carry the same name (spec edge case) and must stay separate options.

#### T14: Add the month navigator ✅

**Where**: `mobile/src/shared/ui/MonthNavigator.tsx`
**What**: Shows the current month in Portuguese with previous and next controls, built on `shiftMonth`.
**Depends on**: none
**Requirement**: DASH-01
**Tests**: screen layer — the label for a given month, and pressing each control reporting the right target month including across a year boundary
**Gate**: `full`
**Status**: ✅ Complete. `src/shared/ui/MonthNavigator.tsx` + `MonthNavigator.test.tsx`, 6 tests. Gate: `tsc` exit 0, 113 passed 0 failed (was 107). Phase 3 closed.

Every expected month is a **literal pair** — `(2026, 7)`, `(2025, 12)`, `(2027, 1)` — never a `shiftMonth` call inside the assertion, which would mirror the component and agree with it on any wrong answer (L-010). Both year boundaries are covered in both directions: January back to December 2025 and December forward to January 2027.

The component holds no state. It reports the target month and re-renders whatever the screen passes back, so one screen owns which month its queries are keyed on. The last test pins that: pressing "next" leaves `Agosto de 2026` on screen, which is what keeps the navigator from drifting out of step with the month the data was fetched for.

---

### Phase 4: Authentication and the route guard

```
T15 -> T16
T15 -> T17
T16 -> T18
T17 -> T18
T18 -> T19
```

#### T15: Add the auth API hooks ✅

**Where**: `mobile/src/features/auth/api/useAuth.ts`
**What**: `useSignIn` posting to `/login` and `useSignUp` posting to `/user`, each storing the returned token through the session store on success.
**Depends on**: none
**Requirement**: AUTH-01
**Tests**: hook layer — the exact payload posted, and the session store reaching `signedIn` with the returned token on success and staying `signedOut` on failure
**Gate**: `full`
**Status**: ✅ Complete. `src/features/auth/api/useAuth.ts` + `useAuth.test.tsx`, 8 tests over `renderHook` and a mocked `fetch`, so the payload asserted is the one the real `httpClient` serialised. Gate: `tsc` exit 0, 124 passed 0 failed (was 113).

Both payloads are pinned as **literal** JSON strings — `'{"email":"rayan@balance.app","password":"segredo123"}'` and `'{"name":"Rayan","email":"rayan@balance.app","password":"segredo123"}'` — not rebuilt with `JSON.stringify` in the assertion, which would agree with the hook on any wrong field name (L-010). Success pins the store's `status`, `token` and `name` **and** `setToken` receiving the issued token: persisting is what AUTH AC3 reads back, and a hook that only set state in memory would pass a status-only assertion and lose the session on restart. Failure pins `status` still `signedOut`, `token` still null and `setToken` **not** called.

**Deviation, recorded rather than silent.** A rejected sign-in is a **401**, not a 400: the backend's `InvalidLoginException` carries `HttpStatusCode.Unauthorized`. `httpClient` mapped 401 to an `UnauthorizedError` that dropped the envelope, which left spec AUTH AC7 — "show the message the API returned" — reachable only by the app writing wording of its own, against MAD-004. Two additive changes to Phase 2 files close it: `UnauthorizedError` now carries `messages: string[]` (defaulting to `[]`, so every existing call site is unchanged) and `httpClient` fills it from the same envelope reader the other failures use. Three tests were **added** to `ApiError.test.ts` and `httpClient.test.ts`; none was weakened, skipped or deleted.

`authErrorMessages` lives with the auth feature and reads both types, because the two auth screens meet different ones — sign-in a 401, sign-up a 400. The API's wording always wins; the error's own text stands in only when the response carried no messages at all.

The suite's mutation cache is destroyed in `afterEach`. A settled mutation holds a garbage-collection timer for its `gcTime`, and Jest reported a worker that would not exit until it was cancelled — `clear()` alone drops the entry and leaves the timer running.

#### T16: Add the sign-in screen ✅

**Where**: `mobile/app/(auth)/sign-in.tsx`
**What**: Email and password fields, a submit that calls `useSignIn`, and the API's messages rendered on failure with the entered email preserved.
**Depends on**: T15
**Requirement**: AUTH-01
**Tests**: screen layer — a successful submit sending the typed credentials, a failure rendering the API's own message text, and the email still present afterwards (spec AUTH AC7)
**Gate**: `full`
**Status**: ✅ Complete. `src/features/auth/ui/SignInScreen.tsx` + `SignInScreen.test.tsx`, 7 tests; `app/(auth)/sign-in.tsx` is a one-line mount point. Gate: `tsc` exit 0, 131 passed 0 failed (was 124).

**The screen lives in `src/features/auth/ui/`, not in `app/`.** Expo Router's `require.context` matches every `.tsx` under `app/`, so a `sign-in.test.tsx` beside the route would be published as the route `/sign-in.test`. Splitting the screen out is also what `design.md`'s architecture diagram already draws — routes point at feature `ui/` screens.

**Spec AUTH AC7 is two criteria and gets two assertions (L-003).** The message is asserted as the API's literal text, `E-mail e/ou senha inválidos.`, and the email is asserted on **the field's own value** afterwards — `screen.getByLabelText('E-mail').props.value` reading `'rayan@balance.app'`. An implementation that resets the form on failure satisfies an error-only assertion and still makes the user retype their address, which is precisely what the criterion forbids.

The submitted body is a literal JSON string rather than a rebuilt object, so a renamed field cannot agree with itself (L-010). Success is pinned on the session store reaching `signedIn`, not on a navigation call: the screen never navigates, because the guard renders the `(app)` group off the session (T18).

`expo-router`'s `Link` is mocked as the `Text` the real one renders. Where it points is Expo Router's concern; that the registration screen is reachable at all is spec AUTH AC2's, and is asserted.

⚠️ **Deferred, recorded in `context.md`:** the password renders in clear text. `Field` carries no `secureTextEntry`, no acceptance criterion names masking, and widening T13's primitive here would be scope creep.

#### T17: Add the sign-up screen ✅

**Where**: `mobile/app/(auth)/sign-up.tsx`
**What**: Name, email and password fields calling `useSignUp`, and a link back to sign-in.
**Depends on**: T15
**Requirement**: AUTH-01
**Tests**: screen layer — the payload sent on submit and the API's validation messages rendered on rejection
**Gate**: `full`
**Status**: ✅ Complete. `src/features/auth/ui/SignUpScreen.tsx` + `SignUpScreen.test.tsx`, 4 tests; `app/(auth)/sign-up.tsx` mounts it, same split as T16. Gate: `tsc` exit 0, 135 passed 0 failed (was 131).

The payload is a literal JSON string, `'{"name":"Rayan","email":"rayan@balance.app","password":"segredo123"}'`, so field order and field names are both pinned (L-010). The rejection test responds with **two** `errorMessages` and asserts **both** on screen: a screen rendering only the first would satisfy a single-message assertion while hiding half of what the API said (L-003, MAD-004). The same test pins the session still `signedOut`, so a rejected registration cannot half-authenticate.

Spec AUTH AC2's "show the month dashboard" is asserted as the session reaching `signedIn` with the issued token. The guard, not this screen, decides what renders; nothing here navigates.

No client-side rule about name, email or password length exists. Those belong to the API's `RegisterUserValidator` (MAD-001), and its wording is what the screen shows.

#### T18: Add the root layout and route guard ✅

**Where**: `mobile/app/_layout.tsx`
**What**: `QueryClientProvider`, session `restore` on mount, and a guard rendering `(auth)` when signed out and `(app)` when signed in. While `status` is `loading` it renders a splash, never the sign-in screen.
**Depends on**: T16, T17
**Requirement**: AUTH-02
**Tests**: route-guard layer — one test per session status, including that `loading` renders neither group; a stored token reaching the app group without a credential prompt (spec AUTH AC3)
**Gate**: `full`
**Status**: ✅ Complete. `src/features/auth/ui/RootLayout.tsx` + `RootLayout.test.tsx`, 7 tests; `app/_layout.tsx` mounts it, `app/(auth)/_layout.tsx` makes the auth group one navigator, and the scaffold's `app/index.tsx` was deleted as T1 said it must be. Gate: `tsc` exit 0, 142 passed 0 failed (was 135).

**All three statuses are asserted separately, and `loading` is asserted to render neither group** — `queryByTestId('group-(auth)')` and `group-(app)` both null, not merely "something rendered". `signedIn` and `signedOut` are each pinned in both directions: the group that must appear, and the group that must not. A guard that mounted both would satisfy a one-sided check while leaving the sign-in screen reachable from inside the app.

Spec AUTH AC3 gets a dedicated test over the real store: with a token in storage, neither group is mounted in the frame before the read resolves, the app group appears once it does, and the auth group is asserted null **again afterwards** — so "went straight there" means it was never passed through, not just that it ended up right. AC4 is the mirror with empty storage.

**Discrimination sensor run.** The guard was rewritten two-state, `guard={status !== 'signedIn'}` with the `loading` branch removed. Exactly three tests failed — both `loading` assertions and the AC3 no-flash test — while the `signedIn` and `signedOut` tests passed unchanged, which is what shows they were not carrying the criterion on their own. Reverted; the suite is back to 142 passed.

`Stack` and `Stack.Protected` are mocked as what they are: `Protected` renders its children only while its `guard` holds, which is exactly how the real one drops a group from the navigator. The real ones need a navigation container, and the decision under test is which group the status produces.

The screen and its test live in `src/features/auth/ui/` for the reason T16 records — a `.tsx` beside `app/_layout.tsx` would be published as a route.

**Known intermediate state:** the `(app)` group has no routes until T43 and no layout until T44, so a signed-in session has nothing to render on a device between here and Phase 9. The `full` gate does not reach it and the `web` gate (T48) runs after Phase 9.

#### T19: Add sign-out and session expiry handling ✅

**Where**: `mobile/src/features/auth/api/useSignOut.ts`
**What**: `signOut` clearing the token and calling `queryClient.clear()`, plus wiring `UnauthorizedError` from any request to the same path.
**Depends on**: T18
**Requirement**: AUTH-03
**Tests**: hook layer — sign-out emptying the query cache so a second account cannot read the first's data, and a 401 from an authorised call driving the session to `signedOut` (spec AUTH AC5, AC6)
**Gate**: `full`
**Status**: ✅ Complete. `src/features/auth/api/useSignOut.ts` + `useSignOut.test.tsx`, 7 tests; `RootLayout.tsx` installs the handler on the client the app runs on. Gate: `tsc` exit 0, 149 passed 0 failed (was 142). Phase 4 closed.

**Spec AUTH AC6 is asserted by reading the cache, not by watching `clear` get called.** The cache is seeded with the first account's people and dashboard, both are confirmed present, and after `endSession` each key reads `undefined` and `getQueryCache().getAll()` is empty. Asserting the call would prove the line ran; only reading it back proves the second account cannot see the first's month.

**Spec AUTH AC5 is wired once, globally**, on the query cache's and the mutation cache's `onError`, so a 401 from any authorised request ends the session whichever screen was asking. Both paths are pinned separately — a query 401 and a mutation 401 — because they are two different callbacks and wiring one is easy to mistake for wiring both. A third test drives a 401 through **the root layout's own client**, so the reaction is proved on the client the app actually runs on rather than only on one the test set up.

The reaction is scoped to a session that was signed in. The API answers a wrong password with 401 too, and treating that as an expired token would empty the cache on every typo and cast doubt on the sign-in screen's own message (AUTH AC7). One test pins that: a 401 on `/login` while signed out leaves storage untouched.

**Discrimination sensor run, twice.**
- `client.clear()` removed from `endSession`: exactly the three cache assertions failed while the token test kept passing, which is what shows the token half was not silently carrying AC6's cache half. Reverted.
- The two `onError` installations removed: exactly the three 401 tests failed, including the one on the app's own client, while sign-out and the rejected-sign-in test passed. Reverted; the suite is back to 149 passed.

Every hook in this suite is given `gcTime: 0`. Ending a session empties the cache from inside the error handler, which drops each entry before its garbage-collection timer is cancelled; the timer then outlives the suite and Jest reports a worker that will not exit.

⚠️ **Spec-to-task gap, surfaced rather than papered over.** `useSignOut` is proved but nothing calls it: no remaining task adds a sign-out control to a screen. Spec AUTH AC6 begins "WHEN a user signs out", and today the user has no way to. The tab shell (T44) or the state sweep (T45) needs to mount one, or the feature ships with the criterion reachable only from a test.

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

#### T20: Add the catalogue API hooks ✅

**Where**: `mobile/src/features/catalogue/api/useCatalogue.ts`
**What**: Queries for people, categories and accounts, and mutations creating each, every mutation invalidating its own list key.
**Depends on**: none
**Requirement**: CAT-01, CAT-02
**Tests**: hook layer — each mutation's payload, and that it invalidates the matching key so the list refreshes without a manual reload (spec CAT AC2)
**Gate**: `full`
**Status**: ✅ Complete. `src/features/catalogue/api/useCatalogue.ts` + `useCatalogue.test.tsx`, 9 tests over `renderHook` and a routed `fetch` mock, so every payload asserted is the one the real `httpClient` serialised. Gate: `tsc` exit 0, 158 passed 0 failed (was 149).

**Spec CAT AC2 is asserted as the list changing, never as the mutation succeeding.** Each of the three invalidation tests lets the list settle, then re-stubs what the API would answer, then mutates, then asserts the list now reads both names and that the GET route was called **twice**. Nothing re-reads that route unless the mutation invalidated the key the query registered under, so the second list arriving is the criterion itself. A success-only assertion would pass with no invalidation at all.

**Discrimination sensor run.** `invalidateQueries` was removed from `useCreatePerson`. Exactly one test failed — the people AC2 test, reporting `['Rayan']` where `['Rayan', 'Marina']` was required — while the payload and success assertions passed unchanged, which is what shows they were not carrying the criterion. Reverted; the suite is back to 158 passed.

The three payloads are literal JSON strings (L-010), so a renamed or reordered field cannot agree with itself. `priority` is pinned as the integer `0`, not `'0'` — the API's `ExpensePriority` is an enum and a stringified value would be rejected.

Each `onSuccess` **returns** its invalidation promise, so the mutation stays pending until the refreshed list has arrived. A form closing on success then closes over data that is already correct.

**Additive file, recorded rather than silent:** `src/features/catalogue/model/catalogue.ts` holds the three wire types, which is where `design.md`'s folder layout puts them (`features/catalogue/{api,model,ui}`). `CategoryPriority` is the union `0 | 1 | 2` rather than `number`, so T22's label map is exhaustive by the type checker instead of by a default branch nobody looked at.

#### T21: Add the people screen ✅

**Where**: `mobile/app/(app)/catalogue/people.tsx`
**What**: Lists People with the four states, and a form creating one.
**Depends on**: T20
**Requirement**: CAT-01, CAT-02
**Tests**: screen layer — loading, empty, error and data states, and a create appearing in the list
**Gate**: `full`
**Status**: ✅ Complete. `src/features/catalogue/ui/PeopleScreen.tsx` + `PeopleScreen.test.tsx`, 8 tests; `app/(app)/catalogue/people.tsx` is a one-line mount point, same split as T16. Gate: `tsc` exit 0, 166 passed 0 failed (was 158).

All four states are asserted, and two of them carry the weight. The retry is pinned by **re-reading**: the failing stub is swapped for a working one and the list is asserted to appear after the press, so a control that renders and does nothing fails — it would look identical on screen. The loading indicator is asserted in the first frame, before the request resolves, so an empty list cannot stand in for "still loading" and read to the user as "you have no people".

**Spec CAT AC5 is two criteria and gets two tests (L-003).** The rejection returns **two** `errorMessages` and both are asserted on screen, word for word (MAD-004). The second test asserts the fields' own values afterwards — `getByLabelText('Nome').props.value` reading `'Marina'` — because a screen that clears its form on failure satisfies an error-only assertion and still makes the user retype everything.

Spec CAT AC2 is asserted at the screen layer the same way T20 asserts it at the hook layer, and for the reason the criterion names: nothing in the test reloads the screen, so the new person appears only if the mutation made the list read the API again.

The description is asserted per row, not only the names (L-004). A person whose description is null renders no detail line rather than the string "null".

**Additive file, recorded:** `src/features/catalogue/ui/errors.ts` — `apiMessages` and `listErrorMessage`, shared by the three catalogue screens so the reader is written once. It mirrors `authErrorMessages`, which lives with the auth feature; neither reaches across features. `listErrorMessage` owns exactly one sentence, for a failure the API did not describe. Telling connectivity apart from validation (spec UX AC5) stays with T45's sweep rather than being half-built here.

#### T22: Add the categories screen ✅

**Where**: `mobile/app/(app)/catalogue/categories.tsx`
**What**: Lists Categories showing the priority as Essencial, Importante or Supérfluo, and a form creating one.
**Depends on**: T20
**Requirement**: CAT-01, CAT-02
**Tests**: screen layer — all three priority labels rendered from their integers, and two categories with the same name both listed (spec edge case)
**Gate**: `full`
**Status**: ✅ Complete. `src/features/catalogue/model/priority.ts` (`PRIORITY_LABEL`, exhaustive over the `CategoryPriority` union) + `src/features/catalogue/ui/CategoriesScreen.tsx` + its test, 11 cases; `app/(app)/catalogue/categories.tsx` is a one-line mount point, same split as T21. Gate: `tsc` exit 0, 177 passed 0 failed (was 166).

**A real ambiguity surfaced and was fixed, not worked around.** The create form's `Picker` always renders all three priority labels as option buttons, so an unscoped `getByText('Essencial')` matches both the picker option and a list row whenever a row happens to be Essencial — `two categories with the same name` failed on exactly that collision on first run. Fixed by giving the list a `testID` and scoping every row-content assertion to it with `within(...)`, in both the duplicate-name test and the three priority-label tests, rather than loosening any assertion to `getAllByText`.

**Discrimination sensor run and reverted.** `PRIORITY_LABEL[1]` was set to `'Essencial'` in the working tree; exactly `renders priority 1 as Importante` failed, the other ten cases stayed green. Reverted before committing.

CAT AC2, AC5 and the L-003/L-004 discipline follow T21's already-verified pattern (create refreshes the list without a reload; a rejection shows the API's message and keeps the field filled).

#### T23: Add the accounts screen ✅

**Where**: `mobile/app/(app)/catalogue/accounts.tsx`
**What**: Lists Accounts and creates one, with closing day, due day and limit all optional.
**Depends on**: T20
**Requirement**: CAT-01, CAT-02
**Tests**: screen layer — an account created with all three optional fields empty succeeding and rendering without "NaN" or "undefined" (spec CAT AC4)
**Gate**: `full`
**Status**: ✅ Complete. `src/shared/lib/parseOptionalInt` (new, additive — 6 tests) alongside `AccountsScreen.tsx` + its test, 11 cases; `app/(app)/catalogue/accounts.tsx` is a one-line mount point. Gate: `tsc` exit 0, 193 passed 0 failed (was 177).

**CAT AC4, both directions asserted.** The read side: an account with all three fields null renders `queryByText(/NaN|undefined|null/)` as empty. The write side: submitting with the three text fields left empty is asserted on the **parsed JSON payload**, `closingDay`/`dueDay`/`limit` each `toBeNull()` — not `0`, not `""`. `parseOptionalInt('')` returns `null` rather than the `NaN` a bare `Number('')` coercion would, which is the distinction the API's `int?` needs.

**CAT AC6, both branches.** One Person: the picker never renders (`queryByText('Rayan')` is null) and the submitted `personId` is theirs regardless. Two People: the picker renders both names, nothing is preselected, and pressing one sends that one's id.

**Discrimination sensor run and reverted.** `closingDay: parseOptionalInt(closingDay) ?? 0` was injected in the working tree; exactly `sends null, not 0 or an empty string` failed, the other nine cases in the file stayed green. Reverted before committing.

#### T24: Add the catalogue navigation ✅

**Where**: `mobile/app/(app)/catalogue/_layout.tsx`
**What**: Groups the three catalogue screens under one route with tabs or a menu.
**Depends on**: T21, T22, T23
**Requirement**: CAT-01
**Tests**: screen layer — each of the three destinations reachable
**Gate**: `full`
**Status**: ✅ Complete. `src/features/catalogue/ui/CatalogueMenu.tsx` (2 tests) + `app/(app)/catalogue/_layout.tsx` (a `Stack`, same shape as `(auth)/_layout.tsx`) + `app/(app)/catalogue/index.tsx` mount point. Gate: `tsc` exit 0, 195 passed 0 failed (was 193).

**Menu over tabs, and why.** `Tabs` from `expo-router` needs `@react-navigation/bottom-tabs`, not yet a dependency, and the app's real tab bar is T44's job (spec DASH-01). Installing that package here to build a three-item sub-navigator T44 would supersede is the dependency doing T44's work early — so `CatalogueMenu` links out with `Link` instead, at zero new dependencies. `Link` is mocked the same way `RootLayout.test.tsx` mocked `Stack` for T18: a `Text` carrying the target `href` as its `testID`, enough to prove which route each item targets without a real navigation container.

**Phase 5 complete: T20–T24, five tasks, 24 tasks of 50 done overall.**

---

### Phase 6: Income

```
T25 -> T26
T26 -> T27
T26 -> T28
T26 -> T29
T26 -> T30
```

#### T25: Add the income model ✅

**Where**: `mobile/src/features/income/model/income.ts`
**What**: Types mirroring the API contracts, plus the `IncomeStatus` map — Pendente, Recebido, Divergente — kept separate from the expense map even though the integers coincide.
**Depends on**: none
**Requirement**: INC-01
**Tests**: pure-function layer — every status integer mapping to its literal label, including a fixture per branch (lesson L-005)
**Gate**: `full`
**Status**: ✅ Complete. `src/features/income/model/income.ts` + `income.test.ts`, 5 tests. Gate: `tsc` exit 0, 200 passed 0 failed (was 195).

Each of the three branches gets its own fixture and its own **literal** expected string (L-005, L-010); no assertion is built from the map itself, which would agree with whatever wording the map happened to hold. Status 1 is pinned in both directions — `Recebido`, and asserted **not** to be `Pago` — because that integer is exactly where the income and expense vocabularies part. The two maps stay in their own features (T31 writes the expense one), so a rename on one side cannot retitle the other.

`IncomeStatus` and `IncomeType` are the unions `0 | 1 | 2` and `0 | 1` rather than `number`, which makes the label record exhaustive by the type checker instead of by a default branch.

`expectedAmount` and `expectedDay` are `number | null` on `MonthlyIncomeLine`: a Variable source has no version and the API sends null for both. Null and zero are different facts, and T27 is where that distinction reaches the screen.

#### T26: Add the income API hooks ✅

**Where**: `mobile/src/features/income/api/useIncome.ts`
**What**: `useIncomeMonth`, `useRegisterIncomeSource`, `useRegisterIncomePayment`, `useChangeIncomeValue`. Payment and value-change invalidate `incomeMonth` and `dashboard` for the reference month.
**Depends on**: T25
**Requirement**: INC-02, INC-03
**Tests**: hook layer — each payload, a recurring source sending amount and expected day while a variable source sends neither (spec INC AC3, AC4), and the invalidated keys after a payment
**Gate**: `full`
**Status**: ✅ Complete. `src/features/income/api/useIncome.ts` + `useIncome.test.tsx`, 11 tests over `renderHook` and a routed `fetch` mock, so every payload asserted is the one the real `httpClient` serialised. Gate: `tsc` exit 0, 214 passed 0 failed (was 200).

**The month a payment invalidates is the one the API returned (MAD-003), not the one on screen.** The story's Independent Test is a single test here: a payment dated `2026-09-03` for reference month `2026-08-01` makes August read the API **again** and leaves September at **one** call. Asserting only August would pass under a hook that invalidated everything; asserting only September would pass under one that invalidated nothing.

**Discrimination sensor run.** `invalidateMonthOf(client, payment.referenceMonth)` was changed to `payment.paymentDate` in the working tree. Exactly two tests failed — the August/September one and the dashboard one — while the three payload tests stayed green, which is what shows they were not carrying the criterion. Reverted; the suite is back to 214 passed.

**Spec INC AC3 and AC4 are two payload shapes and get two tests.** `RegisterIncomeSourceInput` is a discriminated union, so a Variable source carrying an amount does not compile. The variable test pins the literal body `'{"name":"Freelance","type":1,"personId":"p1"}'` **and** asserts `'amount' in payload` is false: the API rejects a Variable source that sends either field, so absent and zero are not interchangeable.

The dashboard invalidation is asserted through a `useQuery` registered under `qk.dashboard(2026, 8)` with a counting `queryFn`, which is the key T42 will register under. A payment that refreshed only `incomeMonth` would leave the dashboard showing the figure the income screen had just corrected.

Spec INC AC9 gets its own test: two payments against the same source and reference month both reach the API. Nothing client-side guards against it, unlike a recurring bill, which the backend rejects.

**Additive change to a Phase 2 file, recorded rather than silent:** `qk.incomeMonths()` — the bare `['incomeMonth']` prefix — was added to `queryKeys.ts` with three tests, one of them pinning that it is the head of `qk.incomeMonth(y, m)`. Registering a source is not scoped to one month (it belongs to its start month and every month after), so it invalidates the prefix rather than guessing one month and leaving the rest stale. Nothing in `queryKeys.test.ts` was weakened or removed.

#### T27: Add the income month screen ✅

**Where**: `mobile/app/(app)/income/index.tsx`
**What**: One line per source with expected, received and status, with month navigation and the four states.
**Depends on**: T26
**Requirement**: INC-01
**Tests**: screen layer — expected, received **and** the status label asserted per line, not just the totals (lesson L-004); a variable source rendering an absent expected rather than zero
**Gate**: `full`
**Status**: ✅ Complete. `src/features/income/ui/IncomeMonthScreen.tsx` + its test, 10 cases; `app/(app)/income/index.tsx` is a one-line mount point. Gate: `tsc` exit 0, 226 passed 0 failed (was 214).

**A real ambiguity surfaced on the first run and was fixed, not worked around.** `Recebido` is both the heading of the received figure and the label of status 1, so a row-wide `getByText('Recebido')` matched two nodes and could not tell an amount heading from a status. Each of the three fields spec INC AC1 names now has its own `testID` subtree — `income-expected-*`, `income-received-*`, `income-status-*` — and every assertion is scoped with `within(...)`. No assertion was loosened to `getAllByText`; the result is stronger than the row-level form, because a screen rendering the wrong status can no longer be rescued by a heading that happens to carry the same word.

**Three assertions per line, on three separate lines (lesson L-004).** Pendente with 5.000,00 expected and 0,00 received; Recebido with 1.800,00 twice; Divergente with 900,00 expected against 745,50 received. A fourth test pins the statuses apart from each other — `income-status-s1` asserted **not** to read `Recebido` — so one label bleeding across every line would fail.

**Discrimination sensor run.** The absent-expected branch was replaced with `<Money value={line.expectedAmount ?? 0} />` in the working tree. Exactly one test failed — `renders the expected amount as absent, not as R$ 0,00` — while the other nine stayed green. Reverted; the suite is back to 226 passed. Null and zero are different facts: one says nothing is expected of a variable source, the other says R$ 0,00 was expected and did not arrive.

**Additive files, recorded:**
- `src/features/income/ui/errors.ts` — `apiMessages` / `listErrorMessage` for the income feature, mirroring the catalogue's rather than importing it, so neither feature can retitle the other's copy.
- `currentMonth()` in `src/shared/lib/dates.ts` (2 tests) — the month a month-scoped screen opens on. It reads the local getters rather than slicing `toISOString()`; the second test pins that difference at the suite's UTC-11 offset, where a local evening of 31 August is already September in UTC. The screen test mocks it so every month label asserted is a literal.

Totals are deliberately not rendered. Spec INC AC1 names three things per **line**, and the month's totals are the dashboard's subject (DASH-01).

#### T28: Add the register income source screen ✅

**Where**: `mobile/app/(app)/income/new.tsx`
**What**: A form switching between Recurring and Variable, hiding amount and expected day for Variable.
**Depends on**: T26
**Requirement**: INC-02
**Tests**: screen layer — the payload for each type, and the API's messages rendered on rejection
**Gate**: `full`
**Status**: ✅ Complete. `src/features/income/ui/RegisterIncomeSourceScreen.tsx` + its test, 6 cases; `app/(app)/income/new.tsx` is a one-line mount point. Gate: `tsc` exit 0, 232 passed 0 failed (was 226).

**Spec INC AC3 and AC4 are two payload shapes and get two literal bodies.** Recurring sends `'{"name":"Salário","type":0,"personId":"p1","amount":5000,"expectedDay":5}'`; Variable sends `'{"name":"Freelance","type":1,"personId":"p1"}'`, and the parsed payload is asserted to lack **both** keys rather than to carry falsy values — the API rejects a Variable source that sends either, so absent and zero are not interchangeable. A third test pins that the two fields are not rendered at all once the type is Variable, so there is nothing to submit by accident.

Spec INC AC8 returns **two** `errorMessages` and both are asserted word for word (L-003, MAD-004).

Spec CAT AC6 applies here too, because a source belongs to a Person: one person is preselected with no picker shown, two people preselect nobody and the chosen id is what is sent.

**An amount that does not parse is sent as `0`, deliberately.** The API answers it with its own "maior que zero" message, so the app carries no client-side rule and no client-side sentence (MAD-001, MAD-004). The alternative — a local validation message — is a second copy that drifts the first time the API changes its own.

**A timing bug in the test was fixed at its cause, not by loosening the assertion.** The form renders before the person list arrives, and the submit guard silently skips while `personId` is null; a press issued right after render therefore sent nothing, and only the rejection test (which types nothing first) exposed it. `openForm` now waits on the cached person list rather than on the first field appearing.

`usePeople` is imported from the catalogue feature. People belong to the catalogue and income only reads them; what stays unshared is the error copy, which income owns its own (`features/income/ui/errors.ts`).

#### T29: Add the record income payment screen ✅

**Where**: `mobile/app/(app)/income/payment.tsx`
**What**: A form with the reference month separate from the payment date, defaulting the reference month to the one being viewed.
**Depends on**: T26
**Requirement**: INC-03
**Tests**: screen layer — a payment dated in one month for a different reference month sending both distinctly (spec INC AC5), and the month refreshing afterwards
**Gate**: `full`
**Status**: ✅ Complete. `src/features/income/ui/RecordIncomePaymentScreen.tsx` + its test, 7 cases; `app/(app)/income/payment.tsx` is a one-line mount point. Gate: `tsc` exit 0, 241 passed 0 failed (was 232).

**The two dates are two controls, and four tests hold them apart.** The reference month is a `MonthNavigator` starting on the month the route was opened for; the payment date is its own field, defaulting to today. The story's Independent Test is asserted directly: a payment dated `2026-09-03` sends `referenceMonth: '2026-08-01'`, and the two are additionally asserted **not** to be equal. Two more tests move each date without the other — the reference month back to July while the payment date stays on 3 September, and a typed payment date of 5 August against reference month August.

**Discrimination sensor run.** `referenceMonth` was rewritten to reuse `paymentDate` in the working tree. Exactly the four AC5 tests failed; the AC6, AC8 and AC9 tests passed unchanged, which is what shows they were not carrying the criterion. Reverted; the suite is back to 241 passed.

**Spec INC AC6 is asserted as the month changing on screen, not as the mutation succeeding.** The month screen is rendered beside the form in one test. Its line reads Pendente / R$ 0,00, the payment is recorded, and it reads Recebido / R$ 5.000,00 — with nothing in the test reloading anything. That the invalidation is keyed on the **response's** reference month is what the AC6 test keeps passing under the collapse mutation above, so the two criteria are proved separately rather than one standing in for the other.

**Spec INC AC9 gets its own screen test:** a second payment for the same source and month is sent, with its own amount, rather than refused. No client-side guard was added — income sums several payments in a month, unlike a recurring bill.

Spec INC AC8 returns **two** `errorMessages` and both are asserted word for word (MAD-004).

**Additive helper, recorded:** `todayApiDate()` in `src/shared/lib/dates.ts` (2 tests), the payment date's default. Like `currentMonth`, it reads the local getters; the second test pins that at the suite's UTC-11 offset, where `toISOString()` on a local evening of 21 August already reads the 22nd and would record the payment a day late.

The route params carry the month being viewed (`?year=&month=`), read through `useLocalSearchParams`, falling back to the current month when the screen is opened without them. `expo-router` is mocked in the test the same way T16 mocked `Link`.

#### T30: Add the change income value screen ✅

**Where**: `mobile/app/(app)/income/change-value.tsx`
**What**: A form sending the new amount, expected day, validity start and change reason.
**Depends on**: T26
**Requirement**: INC-03
**Tests**: screen layer — the full payload including the change reason, and the API's message when the reason is empty
**Gate**: `full`
**Status**: ✅ Complete. `src/features/income/ui/ChangeIncomeValueScreen.tsx` + its test, 4 cases; `app/(app)/income/change-value.tsx` is a one-line mount point. Gate: `tsc` exit 0, 245 passed 0 failed (was 241). Phase 6 closed.

Spec INC AC7 names four values and the literal body pins all four in one assertion (L-003, L-010): `'{"incomeSourceId":"s1","amount":5500,"expectedDay":6,"validityStart":"2026-08-01","changeReason":"Dissídio anual"}'`. The validity start defaults to today and a second test pins that the default is what goes out when it is left alone, so the field is not decorative.

**The empty reason is sent, not blocked, and that is asserted separately from the message.** One test reads `changeReason` back off the payload as `''`; another reads the API's own sentence on screen. A client-side "reason required" rule would be a second copy of a rule the API already owns, and the two would disagree the first time the API reworded it (MAD-001, MAD-004).

**Discrimination sensor run.** A client-side default — `changeReason === '' ? 'Alteração de valor' : changeReason` — was injected in the working tree. Exactly `sends the empty reason rather than refusing to submit` failed; the other three stayed green, including the one that only reads the rendered message. Reverted; the suite is back to 245 passed.

**The picker is not filtered to recurring sources.** A Variable source has no version, and the API says so in its own words. Filtering the options here would put that rule in two places (MAD-001); the trade is one avoidable round trip against a rule that can drift, and the decision log settles it the other way.

**Phase 6 complete: T25–T30, six tasks, 30 tasks of 50 done overall.**

---

### Phase 7: Expenses and installment plans

```
T31 -> T32
T32 -> T33
T32 -> T34
T32 -> T35
```

#### T31: Add the expense model ✅

**Where**: `mobile/src/features/expenses/model/expense.ts`
**What**: Types for the monthly expense response, plus `ExpenseStatus` (Pendente, Pago, Divergente), `ExpenseType` (Crédito, Débito, Pix) and `ExpensePriority` maps.
**Depends on**: none
**Requirement**: EXP-01
**Tests**: pure-function layer — every integer of all three maps to its literal label, one fixture per branch, and `Paid` reading Pago rather than Recebido
**Gate**: `full`
**Status**: ✅ Complete. `src/features/expenses/model/expense.ts` + `expense.test.ts`, 12 tests. Gate: `tsc` exit 0, 257 passed 0 failed (was 245).

Each branch of both maps this feature owns gets its own fixture and its own **literal** expected string (L-005, L-010); no assertion is built from a map itself, which would agree with whatever wording the map happened to hold. Status 1 is pinned in both directions — `Pago`, and asserted **not** to be `Recebido` — because that integer is exactly where the expense and income vocabularies part. The two maps stay in their own features, so a rename on one side cannot retitle the other.

**`ExpensePriority` is not a third map.** The API's priority enum is the same one a category carries, so the type aliases the catalogue's `CategoryPriority` and the labels read through `features/catalogue/model/priority.ts`. Two copies of one enum's wording is how the same integer ends up reading `Supérfluo` on one screen and something else on another. The three branches are still pinned here, because this is the task that names them for the expense side.

`ExpenseStatus` and `ExpenseType` are the union `0 | 1 | 2` rather than `number`, which makes each label record exhaustive by the type checker instead of by a default branch.

`expectedAmount` and `actualAmount` are `number | null` on a recurring line and mean different things: a month with no version in effect has no expected amount (spec edge case), and a bill that has not arrived has no actual one. T33 is where that reaches the screen.

#### T32: Add the expense API hooks ✅

**Where**: `mobile/src/features/expenses/api/useExpenses.ts`
**What**: `useExpenseMonth`, `useRegisterExpense`, `useRegisterInstallmentPlan`. Registering invalidates the month **the API returned**, not the one on screen.
**Depends on**: T31
**Requirement**: EXP-02, EXP-03
**Tests**: hook layer — a registration whose response carries a competence month different from the viewed one invalidating the returned month's keys, not the viewed month's. A test that invalidates the viewed month would pass under the bug this exists to prevent
**Gate**: `full`
**Status**: ✅ Complete. `src/features/expenses/api/useExpenses.ts` + `useExpenses.test.tsx`, 9 tests over `renderHook` and a routed `fetch` mock, so every payload asserted is the one the real `httpClient` serialised. Gate: `tsc` exit 0, 266 passed 0 failed (was 257).

**Every fixture in the file has a competence month that differs from the input's.** The purchase is dated 21 August and the API answers `2026-09-01`, because the account closes on the 20th. August is the month on screen *and* the month the purchase date falls in, so a hook using either one is wrong in the same way — and both wrong answers are the same month, which is why the fixture is built this way rather than around a same-month case that no bug could distinguish.

**MAD-003 is asserted from both directions, twice.** September's month query is asserted to have read the API **again** and August's asserted **not** to have; the same for the two dashboards. A hook invalidating everything would pass the September half; one invalidating nothing would pass the August half. Only the pair states the criterion.

**Spec INST AC2 gets the same treatment across three months.** A 3-installment plan starting 15 September returns installments in September, October and November, each with its own competence month. All three months and all three dashboards are asserted to have re-read; August, which no installment touches, is asserted to have stayed at one call.

**Discrimination sensor run, twice.**
- `useRegisterExpense` was rewritten to invalidate `input.date`'s month — the purchase date, and equally the month on screen. Exactly the two MAD-003 tests failed, while the two payload tests and the month-read tests stayed green, which is what shows they were not carrying the criterion. Reverted.
- `useRegisterInstallmentPlan` was rewritten to invalidate only `installments[0]`'s month. Exactly the two plan-invalidation tests failed, reporting one call where two were required for November. Reverted; the suite is back to 266 passed.

Spec EXP AC3 and AC4 are two payload shapes and get two tests: the default body carries `"competenceMonth":null` as a literal string (L-010) and the parsed payload asserts it is **null**, not absent and not a month the client computed; the override test asserts the chosen month goes out while `date` is untouched. Nothing in this module derives a competence month (MAD-001).

`invalidateMonthsOf` de-duplicates by month, so a plan with two installments in one month invalidates it once.

#### T33: Add the expense month screen ✅

**Where**: `mobile/app/(app)/expenses/index.tsx`
**What**: Variable expenses and recurring bills as two sections, with month navigation and the four states.
**Depends on**: T32
**Requirement**: EXP-01
**Tests**: screen layer — both sections; a recurring line marked provisional when `isEstimate` and unpaid, and showing the real value once paid; the due day asserted per line (lesson L-004 — this exact field shipped wrong in the backend)
**Gate**: `full`
**Status**: ✅ Complete. `src/features/expenses/ui/ExpenseMonthScreen.tsx` + its test, 13 cases; `app/(app)/expenses/index.tsx` is a one-line mount point. Gate: `tsc` exit 0, 279 passed 0 failed (was 266).

**Spec EXP AC1 is asserted as two groups, not as two headings.** Each line is queried **inside** its own list with `within(...)`, and each list is additionally asserted **not** to contain the other's line. A screen rendering everything in one list would satisfy a page-wide text query and fail this one.

**Spec REC AC2 has two conditions, so it gets three fixtures.** Estimated and unpaid marks the figure provisional; estimated and **paid** does not, and shows `actualAmount` instead of the estimate — the estimate it replaced is asserted absent from the same subtree, not merely the new value present; a fixed amount is never marked even before it is paid. A screen marking every estimate passes the first assertion on its own.

**Discrimination sensor run.** `provisional` was rewritten to `line.isEstimate`, dropping the unpaid half. Exactly one test failed — `drops the mark and shows the real value once the bill is paid` — while the other twelve stayed green, including the one that marks an unpaid estimate, which is what shows it was not carrying the criterion. Reverted; the suite is back to 279 passed.

**The due day is asserted per line and in both directions (L-004).** Line r1 reads `Vence dia 10`, line r2 reads `Vence dia 31`, and r1 is asserted **not** to read 31 — one line's field bleeding across every row would otherwise pass. The 31 also pins the spec edge case: a due day longer than the month is shown as the API returned it, not clamped.

The absent-expected branch is pinned the way T27 pinned income's: a bill with no version in effect renders an em dash, and `R$ 0,00` is asserted absent from the same subtree.

**MAD-001 gets its own test.** The fixture's lines add up to 470,50 while the API says `totalCommitted` is 500,00, and 500,00 is what the screen renders. A screen doing its own arithmetic would show the sum of what is on it — which is exactly the second implementation of a server rule the decision log forbids.

**Additive, recorded:** `src/features/expenses/ui/errors.ts` (`apiMessages` / `listErrorMessage`), mirroring income's rather than importing it, so neither feature can retitle the other's copy.

**Spec INST AC3 is rendered here rather than deferred.** An installment appears *in a month*, and the criterion says it shows its position there; the line reads `Parcela 2 de 3` and a one-off purchase is asserted to carry no position node at all. T35 covers the plan's own confirmation. Leaving it to T35 alone would have made the criterion unreachable from the screen the spec names.

⚠️ **Pre-existing flake surfaced, not touched.** `src/features/income/ui/RegisterIncomeSourceScreen.test.tsx` → `shows every message the API sent, word for word` (T28) failed once during this task's gate run and passed on two full re-runs and in isolation at 126 ms. It is a `waitFor` default-timeout race under worker load, not a regression from this task, and nothing here imports it. Fixing another task's test was out of scope; it is recorded so it is not mistaken for noise later.

#### T34: Add the register expense screen ✅

**Where**: `mobile/app/(app)/expenses/new.tsx`
**What**: Name, person, type, amount, category, account, date, and an optional competence-month override. No competence month is computed on the client.
**Depends on**: T32
**Requirement**: EXP-02, EXP-03
**Tests**: screen layer — the payload sending `date` with a null competence month by default; the override sent when chosen; and a response whose competence month differs from the viewed month telling the user where it landed (spec EXP AC6)
**Gate**: `full`
**Status**: ✅ Complete. `src/features/expenses/ui/RegisterExpenseScreen.tsx` + its test, 9 cases; `app/(app)/expenses/new.tsx` is a one-line mount point. Gate: `tsc` exit 0, 288 passed 0 failed (was 279).

**The fixture is the story's Independent Test.** The month on screen is August, the purchase is dated 21 August, and the account closes on the 20th — so the API answers September. The two candidate wrong answers, the viewed month and the purchase date's month, are the same month here, which is what makes a single assertion able to reject both.

**Spec EXP AC3 is asserted as null, not as absent.** The literal body carries `"competenceMonth":null` (L-010) and the parsed payload asserts it is null. A screen sending the month it happens to be showing would look correct on this form and would silently override the server's rule on every credit purchase after a closing day (MAD-001).

**Spec EXP AC6 gets both halves (L-003).** A September answer renders `Lançado em Setembro de 2026.`; an August answer renders **no notice node at all**, asserted with `queryByTestId` returning null. A notice that always appears tells the user nothing about the one case it exists for.

**Discrimination sensor run, twice.**
- The notice was made unconditional. Exactly `says nothing extra when the expense landed in the month on screen` failed; the eight others stayed green, including the one that reads the notice, which is what shows it was not carrying the criterion on its own. Reverted.
- The default `competenceMonth` was replaced with the viewed month, the plausible client-side derivation. Exactly `sends the date and a null competence month` failed. Reverted; the suite is back to 288 passed.

**Spec EXP AC7 — no client-side filter, and a test that would catch one.** With Rayan chosen as the person, the picker still offers Marina's card, and submitting sends `personId: 'p1'` with `accountId: 'a2'`. An expense of one person paid from another's account is deliberate backend behaviour; a filter here would be a rule the server does not have.

Spec EXP AC5 is asserted as the month changing on screen, not as the mutation succeeding: the month screen is rendered beside the form and nothing in the test reloads it. Spec EXP AC8 returns **two** `errorMessages`, both asserted word for word, and the two fields are asserted to still hold what was typed (MAD-004, L-003). Spec CAT AC6 applies here too: one person is preselected, the picker is asserted absent, and their id is still what goes out.

The type is asserted as the integer `2` for Pix, not the label and not `'2'` — the API's enum rejects a stringified value.

#### T35: Add the installment plan screen ✅

**Where**: `mobile/app/(app)/expenses/installment-plan.tsx`
**What**: A form for total, count and start date, showing the generated installments and their amounts on success.
**Depends on**: T32
**Requirement**: INST-01
**Tests**: screen layer — a 100,00 in 3 response rendering 33,33 / 33,33 / 33,34 as literal strings, and the API's message when the count is rejected
**Gate**: `full`
**Status**: ✅ Complete. `src/features/expenses/ui/RegisterInstallmentPlanScreen.tsx` + its test, 6 cases; `app/(app)/expenses/installment-plan.tsx` is a one-line mount point. Gate: `tsc` exit 0, 294 passed 0 failed (was 288). Phase 7 closed.

**The story's Independent Test is asserted per row, and that is what makes it discriminating.** 100,00 in 3 renders `R$ 33,33`, `R$ 33,33`, `R$ 33,34`, each queried **inside its own installment's subtree**, and the third is additionally asserted **not** to read `R$ 33,33`. A screen dividing the total itself would render 33,33 three times, lose a cent, and pass any assertion that only counted rows or looked for 33,33 somewhere on the page. Where the residual lands is the server's rule (MAD-001).

**Discrimination sensor run.** The row's amount was replaced with `Math.floor(totalAmount / installmentCount * 100) / 100` — the obvious client-side split. Exactly `shows how many installments were created and the amount of each` failed, on the third row. Reverted; the suite is back to 294 passed.

Spec INST AC2 is two things and gets two assertions (L-003): the count created reads `3 parcelas criadas`, and each amount is read separately. AC3's position reads `Parcela 1 de 3` … `3 de 3` per row. Each row also names the month **that installment** carries, so the three consecutive months the plan generated are visible rather than implied — the same values T32 invalidates on.

Spec INST AC4 renders the API's sentence word for word and asserts **no summary appears**: a rejected plan generates nothing, and a screen that showed a stale one would tell the user a purchase was split when it was not.

Every expected string is a literal (L-010); no `formatMoney` call appears in the test file. The summary is asserted absent before the first submit, so its presence afterwards means something.

**Phase 7 complete: T31–T35, five tasks, 35 tasks of 50 done overall.**

---

### Phase 8: Recurring bills

```
T36 -> T37
T51 -> T37
T36 -> T38
T36 -> T39
T36 -> T40
T36 -> T41
T37 -> T41
```

#### T36: Add the recurring bill API hooks ✅

**Where**: `mobile/src/features/recurring/api/useRecurring.ts`
**What**: `useRegisterRecurringExpense`, `useRegisterRecurringPayment`, `useUpdateRecurringPayment`, `useChangeRecurringValue`, `useArchiveRecurringExpense`. Archiving invalidates every month, since it changes past and future alike.
**Depends on**: none
**Requirement**: REC-01, REC-03, REC-04
**Tests**: hook layer — each payload, the update sending only amount, date, notes and account (spec REC AC5), and archiving invalidating more than the current month
**Gate**: `full`
**Status**: ✅ Complete. `src/features/recurring/api/useRecurring.ts` + `useRecurring.test.tsx`, 14 tests over `renderHook` and a routed `fetch` mock, so every payload asserted is the one the real `httpClient` serialised. Gate: `tsc` exit 0, 313 passed 0 failed (was 294).

**Five writes, four different cache scopes, and each is asserted apart from the others.** This is the densest invalidation surface in the app, and a test that only asked "was something invalidated" would pass under an implementation that got all four wrong:

| Write | Scope | What the test pins |
| ----- | ----- | ------------------ |
| register | every month from the first version's `validityStart` on | August and September re-read, **July does not** |
| record / correct a payment | the payment's own `referenceMonth` | a bill for August settled on 3 September refreshes **August**, and September stays at one call |
| change the base value | every month from the new `validityStart` on | September re-reads, **July and August do not** (spec REC AC6, "past months unaffected") |
| archive / unarchive | every cached month | July, August, September **and July's dashboard** all re-read |

July is the discriminating month: three of the four writes must leave it alone and the fourth must not. Every month figure comes from the API's response (MAD-003) — the register scope reads the version the API created, not the input, which carries no validity start at all.

**Discrimination sensor run, three mutations at once.** `useRegisterRecurringExpense` and `useChangeRecurringValue` were both switched to invalidate everything, and `useArchiveRecurringExpense` to invalidate from August onward. Exactly four tests failed — one per broken scope, each naming its own criterion — while all six payload and route tests stayed green, which is what shows they were not carrying the scopes. Reverted; the suite is back to 313 passed.

Spec REC AC5 is pinned twice: the literal body of the four fields a correction may change, and `referenceMonth`, `recurringExpenseId` and `paymentId` asserted **absent** from it. The body is built inside the hook rather than spread from the input, so no caller can widen it. Spec REC AC4's other half is pinned here too — a correction issues **zero** POSTs to `/recurring-expense/payment`.

**Additive files, recorded:**
- `src/features/recurring/model/recurring.ts` — the three wire types, where `design.md`'s folder layout puts them. The monthly line stays in `features/expenses/model`, because it arrives inside the monthly expense response.
- `qk.expenseMonths()` and `qk.dashboards()` in `queryKeys.ts` (5 tests, one pinning each as the head of its month key). Archiving invalidates the prefixes; the from-a-month-onward scope reads those same heads through the factories rather than through a literal string, so a renamed resource cannot leave the predicate matching nothing. Nothing in `queryKeys.test.ts` was weakened or removed.

#### T51: Expose a list-all endpoint for recurring expenses (backend prerequisite) ✅

**Where**: `backend/src/Balance.{Domain,Infrastructure,Application,Communication,Api}` — `GET /api/recurring-expense`.
**What**: `IRecurringExpenseReadOnlyRepository.GetAll(User)`, unfiltered by `Archived`; `GetAllRecurringExpensesUseCase`; `ResponseRecurringExpensesJson`; a `[HttpGet]` action on `RecurringExpenseController`.
**Depends on**: none
**Requirement**: REC-01, REC-04
**Tests**: backend use case + endpoint layers — an archived and a non-archived bill both returned with the right `archived` value; ownership scoping; 401 without a token
**Gate**: `test` (run in `backend/`: `dotnet test Balance.sln --nologo`)
**Status**: ✅ Complete. Discovered while implementing T37, not anticipated at Design time.

**The gap, precisely.** `GetForMonth` deliberately excludes archived bills from a month - that is correct, it is the whole point of archiving (spec REC AC7). But it means archived bills never appeared in *any* response the app could read, since the monthly expense view was the only source of recurring-bill data the app had. Once a bill is archived, its id became permanently undiscoverable, and spec REC AC8 ("WHEN a user unarchives...") would have been dead code identical in shape to the `paymentId` gap T49 closed in Phase 0 - an operation the API supports with no way for the client to reach it.

**Fix, mirroring the Category/Account list pattern exactly:** a new repository method, use case, response DTO and `GET` route, none of them filtering on `Archived`. `GetForMonth` is untouched - the fix adds a second read path rather than changing the one the monthly view depends on.

Gate: 358 passed, 0 failed (was 352; 3 use-case + 3 endpoint tests added), build 0 errors 0 warnings. AD-006 verified: `git diff --name-only` carries nothing named `Income*` or under `Incomes/`.

#### T37: Add the recurring bills list screen ✅

**Where**: `mobile/app/(app)/recurring/index.tsx`
**What**: Lists bills with their due day, estimate flag and archived state.
**Depends on**: T36, T51
**Requirement**: REC-01, REC-02
**Tests**: screen layer — the due day and estimate flag asserted per row, and the four states
**Gate**: `full`
**Status**: ✅ Complete. `src/features/recurring/ui/RecurringBillsScreen.tsx` + its test (7 cases) + `src/features/recurring/ui/errors.ts` (already present from the interrupted first attempt at this task); `app/(app)/recurring/index.tsx` is a one-line mount point. Gate: `tsc` exit 0, 325 passed 0 failed (was 294).

**T36's mutations did not yet know about T51 when they were written**, since the list-all endpoint did not exist at the time. Extended before building the screen: `qk.recurringExpenses()` added to the key factory (3 new tests), `useRecurringExpenses()` query hook added, and `useRegisterRecurringExpense`/`useArchiveRecurringExpense` now also invalidate the list key alongside the month/dashboard prefixes they already invalidated - a new bill or a flipped archive flag would otherwise not reach the list until a manual reload. Two new hook tests cover this directly.

Each row asserts its due day, current amount (including the `isEstimate` suffix) and archived tag as **separate** facts, not a combined summary (lesson L-004 applied deliberately, given its origin was exactly a pass-through field on this same domain). Discrimination sensor run and reverted: the archived-tag condition was replaced with a literal `false`; exactly the archived-distinction test failed, the other five stayed green.

**Phase 8 in progress:** T36, T37, T51 (backend prerequisite) done. T38–T41 remain.

#### T38: Add the register recurring bill screen ✅

**Where**: `mobile/app/(app)/recurring/new.tsx`
**What**: Name, person, category, account, due day, base amount and the estimate toggle.
**Depends on**: T36
**Requirement**: REC-01
**Tests**: screen layer — the payload including `isEstimate` in both positions, and the API's message when the due day is out of range
**Gate**: `full`
**Status**: ✅ Complete. `src/features/recurring/ui/RegisterRecurringExpenseScreen.tsx` + its test (4 cases); `app/(app)/recurring/new.tsx` is a one-line mount point. Gate: `tsc` exit 0, 329 passed 0 failed (was 325).

`Picker<T extends string | number>` does not accept `boolean`, so the estimate toggle is an internal `'estimate' | 'fixed'` union converted to `isEstimate` only at submit time - the payload test asserts the boolean lands correctly in both directions regardless. No client-side range check on the due day (MAD-001): an out-of-range value is sent as typed and the API's own `DAY_OUT_OF_RANGE` message is what renders.

**Infrastructure note, unrelated to this task's scope, fixed separately (`a12d840`).** Verifying this task's gate surfaced a leftover git worktree from an earlier dispatch that failed to a transient server error - its directory survived because a VS Code file-watcher handle held it open, and Jest's haste map was reading every duplicate test file inside it, inflating the suite to 654 reported tests. `jest.config.js` now ignores `.claude/worktrees/`, and it is gitignored. The worktree directory itself is still on disk, harmless once ignored; removing it needs VS Code to release its handle first.

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
T44 -> T50
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

#### T44: Add the tab navigation shell and the sign-out control

**Where**: `mobile/app/(app)/_layout.tsx`
**What**: Tabs for Dashboard, Receitas, Despesas, Recorrentes and Catálogo, plus a **sign-out control** reachable from the shell.
**Depends on**: T43
**Requirement**: DASH-01, AUTH-03
**Tests**: route-guard layer — every tab reachable, the dashboard being the initial route, and pressing sign-out driving the session to `signedOut` and emptying the query cache
**Gate**: `full`

> **Amended after Batch 3.** `useSignOut` shipped in T19 fully tested and no task mounted it, so spec
> AUTH AC6 — "WHEN a user signs out…" — was reachable only from a test. That is backend lesson
> **L-002** in mirror image: there a state shipped with no operation able to produce it; here an
> operation shipped with no way for a user to invoke it. Either way the criterion is unreachable in the
> delivered product, so the control lands here rather than in a follow-up.

#### T50: Mask the password field

**Where**: `mobile/src/shared/ui/form.tsx`
**What**: A `secure` prop on `Field` forwarding `secureTextEntry`, applied to both password inputs.
**Depends on**: T44
**Requirement**: AUTH-01
**Tests**: screen layer — the sign-in and sign-up password fields assert `secureTextEntry` is set, **and the email field asserts it is not**, so the prop cannot be applied indiscriminately and still pass
**Gate**: `full`

> **Added after Batch 3.** T16 was right to decline widening T13's primitive mid-task: no acceptance
> criterion names masking, and inventing scope inside a task is how deliveries bloat. But a password
> rendering in clear text is a defect a user meets in the first five seconds, not an enhancement — so
> it becomes its own task with its own commit and its own test, rather than being deferred or smuggled
> into a neighbouring one.

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
| REC-01 | T36, T37, T38, T51 |
| REC-02 | T37, T33 |
| REC-03 | T36, T39, T49 |
| REC-04 | T36, T40, T41, T51 |
| INST-01 | T33, T35 |
| UX-01 | T2, T3, T4, T11, T45 |
| UX-02 | T6, T9, T13, T45, T47 |

All 20 requirements are mapped.

**Correction, after Batch 6.** INST-01 was mapped to T35 alone. The criterion — "an installment shows
its position when it appears in a month" — names the month view, and T33's expense month screen
renders that position wherever an installment line falls, not only in T35's own confirmation. Leaving
the map as T35-only would have implied the criterion was unreachable from the screen the spec actually
points at, which it is not: it ships in T33 as well.
