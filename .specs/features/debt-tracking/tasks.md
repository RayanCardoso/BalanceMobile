# Debt Tracking (Mobile) Tasks

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan task by task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Spec**: `.specs/features/debt-tracking/spec.md`
**Design**: `.specs/features/debt-tracking/design.md`
**Status**: Awaiting approval — **blocked on the backend feature shipping first**

**Goal:** Register, pay and review debts in the app - by month and by creditor - rendering every
balance, status and overdue flag the API returns without computing any of them.

**Architecture:** A feature slice in the shape the app already has: types in `src/types`, query keys
and endpoint calls in `src/services`, one hook module per domain in `src/hooks`, one folder per
screen in `src/screens`, thin route files in `app/(app)/debts`. One new shared component. No new
dependency.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript strict, TanStack Query, Zustand, Jest +
React Native Testing Library.

24 tasks across 7 phases. Every task ends in one atomic commit.

---

## Global Constraints

- **The app computes no business rule** (MAD-001). `outstandingBalance`, `isSettled`, `status`, `isOverdue`, installment amounts and schedule months are all rendered from the response. The feature is not done if a grep for a balance or overdue computation finds one.
- **Server state is TanStack Query's; client state is Zustand's** (MAD-002). Every query key is built in `src/services/queryKeys.ts`, never inline.
- **The API's error messages are shown verbatim** (MAD-004). The only client-side checks are emptiness, number format, and credit-requires-account.
- **Dates are sent as `YYYY-MM-DD`**; money is entered as a decimal string and parsed with `parseMoneyInput` before sending.
- **`ExpenseStatus` and `ExpenseType` are imported from `@/types/expense`**, never redeclared.
- **No new dependency.** Screens compose the existing `src/components/form` and `src/components/states` primitives.
- **Tests come first in every task.** Write the failing test, run it, watch it fail for the right reason, then implement. The `Tests` field of each task names the exact cases.

---

## Prerequisite

The backend `debt-tracking` feature **is merged** as of 2026-08-28 (`ac657f4` on `main`). The
endpoints this plan consumes are listed in `../backend/.specs/features/debt-tracking/design.md`
under Controllers.

One backend branch is still open and **this plan depends on it**:
`fix/monthly-debt-line-installment-id` adds `installmentId` to the monthly line. Without it, T21's
"pay this line" flow is unreachable — the line reports the installment's *number*, and
`POST /Debt/payment` wants its *id*. Merge that branch before Phase 6, or reroute the month screen
through the debt detail.

The design doc's header records every other place the shipped API differs from what this plan was
written against. Read it before Phase 1 — the type definitions changed.

---

## Gate Check Commands

The system `node` is v12.6.0 and cannot run this toolchain. `nvm use` needs administrator rights and
is not available, so Node 20 is reached by path.

**Prepending the NVM directory to `PATH` is required, not optional.** npm spawns the package script
as a child process that resolves `node` from `PATH`, finds v12, and dies on optional chaining with
`SyntaxError: Unexpected token .` pointing inside `node_modules` - which looks like a broken
dependency and is not one. Set this once per shell, in PowerShell:

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

---

## Test Coverage Matrix

| Layer | What it proves | Requirements |
| ----- | -------------- | ------------ |
| Query-key factories | Two different filter sets produce two different keys; a factory never ignores an argument | MPAY-03 |
| Label maps and badges — pure | Every branch with **literal** expected strings. Never recompute the map in the assertion (lesson **L-010**) | MVEW-02 |
| Query / mutation hooks — `renderHook` + a test `QueryClient` | The exact request payload sent, and **which query keys are invalidated**. Success alone proves nothing about a screen refreshing | MCRD-01, MDBT-01, MPAY-01, MPAY-03 |
| Screens — React Native Testing Library | Loading, empty, error and data states; the fields a user reads, not just totals (lesson **L-004**); what a press sends; that API-supplied values are rendered unchanged | every requirement |

---

## Execution Plan

| Phase | Theme | Tasks | Batch |
| ----- | ----- | ----- | ----- |
| 1 | Types, keys and the status badge | T1–T4 | 1 |
| 2 | Creditor hooks and screens | T5–T9 | 2 |
| 3 | Debt hooks | T10–T12 | 3 |
| 4 | Debt registration | T13–T15 | 4 |
| 5 | Debt payments | T16–T18 | 5 |
| 6 | Debt list, detail and month | T19–T22 | 6 |
| 7 | Dashboard and manual verification | T23–T24 | 7 — T24 runs inline, not delegated |

---

## Task Breakdown

### Phase 1: Types, keys and the status badge

```
T1 -> T2 -> T3
T1 -> T4
```

#### T1: Add the creditor and debt types

**Where**: create `src/types/creditor.ts`, `src/types/debt.ts`
**What**: Exactly the types in the design's Components section. `ExpenseStatus` and `ExpenseType` are
**imported** from `@/types/expense`, not redeclared. `outstandingBalance` and `isSettled` on `Debt`
and `isOverdue` on `MonthlyDebtLine` are plain fields carrying what the API returned.
**Depends on**: none
**Requirement**: MCRD-01, MDBT-01
**Tests**: none — types carry no behaviour; the `types` gate is the whole check
**Gate**: `types`
**Commit**: `feat: add the creditor and debt types`

#### T2: Add the debt query keys

**Where**: modify `src/services/queryKeys.ts`; modify `src/services/queryKeys.test.ts`
**What**: The eight factories in the design, each with the doc-comment style the file already uses,
explaining why the filters are key parts.
**Depends on**: T1
**Requirement**: MPAY-03
**Tests**: `debts('c1', null, false)` and `debts('c2', null, false)` produce different keys;
`debts(null, null, false)` and `debts(null, null, true)` produce different keys; `debtMonth(2026, 8)`
and `debtMonth(2026, 9)` differ; `debtMonths()` is the prefix of `debtMonth(2026, 8)`;
`creditorSummary('a')` and `creditorSummary('b')` differ
**Gate**: `full`
**Commit**: `feat: add the debt query keys`

#### T3: Add the debt status badge

**Where**: create `src/components/DebtStatusBadge.tsx`, `src/components/DebtStatusBadge.test.tsx`
**What**: Renders `Pendente` for `Pending`, `Pago` for `Paid`, `Divergente` for `Divergent` from the
`status` prop, plus a distinct overdue marker when `isOverdue` is true. Overdue is a **marker beside
the label**, never a fourth label - the API has no such status.
**Depends on**: T1
**Requirement**: MVEW-02
**Tests**: each of the three statuses renders its literal Portuguese label, written out in the
assertion rather than recomputed from the component's own map; `isOverdue` true alongside `Pending`
renders both the Pendente label and the overdue marker; `isOverdue` true alongside `Paid` renders no
overdue marker; `isOverdue` false renders no marker
**Gate**: `full`
**Commit**: `feat: add the debt status badge`

#### T4: Add the debts route group

**Where**: create `app/(app)/debts/_layout.tsx`; modify `src/components/AddMenu.tsx` and its test
**What**: A stack layout with Portuguese screen titles, matching `app/(app)/expenses/_layout.tsx`,
and an entry point to the debts list from the existing add menu. Route files for the individual
screens arrive with their screens in later tasks.
**Depends on**: none
**Requirement**: MDBT-02
**Tests**: the add menu renders a debts entry and pressing it navigates to the debts route
**Gate**: `full`
**Commit**: `feat: add the debts route group`

---

### Phase 2: Creditor hooks and screens

```
T5 -> T6 -> T7
T5 -> T8 -> T9
```

#### T5: Add the creditor hooks

**Where**: create `src/hooks/useCreditors.ts`, `src/hooks/useCreditors.test.tsx`
**What**: `useCreditors(includeArchived)`, `useCreditorSummary(id)`, `useRegisterCreditor()`,
`useArchiveCreditor()` against the endpoints in the design's table, using `get` / `post` / `put` from
`@/services/api` and `qk` from `@/services/queryKeys`.
**Depends on**: T1, T2
**Requirement**: MCRD-01
**Tests**: `useCreditors(false)` requests `/creditor?includeArchived=false` and `useCreditors(true)`
requests it with `true`; `useRegisterCreditor` posts exactly `{ name, type, contact, notes }` and
invalidates `creditorsAll()`; `useArchiveCreditor` puts to `/creditor/{id}/archive?archived=false`
when unarchiving and invalidates both `creditorsAll()` and `debtsAll()`; a 400 surfaces as `ApiError`
carrying the API's messages
**Gate**: `full`
**Commit**: `feat: add the creditor hooks`

#### T6: Add the creditors screen

**Where**: create `src/screens/Creditors/CreditorsScreen.tsx`, `.styles.ts`, `.test.tsx`; create
`app/(app)/debts/creditors/index.tsx`
**What**: Lists creditors with name and type, an `ArchiveToggle` for including archived ones, an
archive action per row, and a press routing to the creditor summary. Composes `Screen`, `Loading`,
`EmptyState`, `ErrorState`.
**Depends on**: T5
**Requirement**: MCRD-02
**Tests**: loading state while fetching; empty state with its explanatory copy when the list is
empty; each creditor's name and type label rendered; toggling the archive control refetches with
`includeArchived` true; the archive action calls the mutation with the row's id; an error renders
`ErrorState` with a retry that refetches
**Gate**: `full`
**Commit**: `feat: add the creditors screen`

#### T7: Add the creditor summary to the creditors screen

**Where**: modify `src/screens/Creditors/CreditorsScreen.tsx` and its test
**What**: Pressing a creditor expands or navigates to its summary, showing the unsettled debt count,
total owed, total paid and outstanding balance - each rendered from the response via `Money`.
**Depends on**: T6
**Requirement**: MDTL-03
**Tests**: the four figures render with the values the API returned; a creditor with no debts renders
zeroes rather than an empty area; the outstanding balance shown is the API's field and **not** the
difference of the two totals in the fixture, which are deliberately set so the two would differ
**Gate**: `full`
**Commit**: `feat: show what is owed to one creditor`

#### T8: Add the register creditor screen

**Where**: create `src/screens/RegisterCreditor/RegisterCreditorScreen.tsx`, `.styles.ts`,
`.test.tsx`; create `app/(app)/debts/creditors/new.tsx`
**What**: Name, type via `OptionChips`, optional contact and notes, `SubmitButton`. Composes existing
form primitives only.
**Depends on**: T5
**Requirement**: MCRD-02
**Tests**: submitting sends exactly the four fields with nulls for the empty optional ones; an empty
name is blocked before sending; the submit control is disabled while the mutation is in flight; an
`ApiError` renders the API's messages verbatim and the form keeps what was typed
**Gate**: `full`
**Commit**: `feat: add the register creditor screen`

#### T9: Wire creditor creation into the debt form's picker

**Where**: modify `src/screens/RegisterCreditor/RegisterCreditorScreen.tsx` and its test
**What**: On success the screen returns to where it was opened from, so a creditor can be created
from inside the debt form without discarding what was typed there.
**Depends on**: T8
**Requirement**: MCRD-02, MDBT-02
**Tests**: after a successful create the screen navigates back rather than to the creditors list; the
creditor list query is invalidated so the picker sees the new entry
**Gate**: `full`
**Commit**: `feat: return to the caller after creating a creditor`

---

### Phase 3: Debt hooks

```
T10 -> T11 -> T12
```

#### T10: Add the debt query hooks

**Where**: create `src/hooks/useDebts.ts`, `src/hooks/useDebts.test.tsx`
**What**: `useDebts(filters)`, `useDebt(id)`, `useDebtMonth(year, month)` plus the three input types
in the design. Queries only - the mutations arrive in T11 and T12.
**Depends on**: T1, T2
**Requirement**: MDBT-01
**Tests**: `useDebts({ creditorId: 'c1', personId: null, includeInactive: false })` requests
`/debt?creditorId=c1&includeInactive=false` and registers under the matching key; omitted filters are
absent from the query string rather than sent as `null`; `useDebt('d1')` requests `/debt/d1`;
`useDebtMonth(2026, 8)` requests `/debt/2026/8`; two different months register under two different
cache entries
**Gate**: `full`
**Commit**: `feat: add the debt query hooks`

#### T11: Add the debt write hooks

**Where**: modify `src/hooks/useDebts.ts` and its test
**What**: `useRegisterDebt()`, `useArchiveDebt()` with the invalidation sets in the design's table.
`RegisterDebtInput` sends `installmentCount` and `dueDay` as null when the mode is `OpenEnded`.
**Depends on**: T10
**Requirement**: MDBT-01, MDTL-02
**Tests**: `useRegisterDebt` posts exactly the eleven fields of `RegisterDebtInput`; a scheduled
input sends the count and due day and an open-ended input sends nulls for both; it invalidates
`debtsAll()`, `debtMonths()` and `dashboards()` - each asserted by key; `useArchiveDebt` puts to
`/debt/{id}/archive?archived=true` and invalidates the same three
**Gate**: `full`
**Commit**: `feat: add the debt registration and archive hooks`

#### T12: Add the debt payment hooks

**Where**: modify `src/hooks/useDebts.ts` and its test
**What**: `useRecordDebtPayment()` and `useCorrectDebtPayment()` with the five-key invalidation set.
`RecordDebtPaymentInput` carries no reference month.
**Depends on**: T11
**Requirement**: MPAY-01, MPAY-03
**Tests**: recording posts exactly `{ debtId, debtInstallmentId, paymentDate, amountPaid, type, accountId, notes }`
and no reference month; an open-ended payment sends `debtInstallmentId: null`; correcting puts to
`/debt/payment/{id}` and sends no `debtId` and no installment id; **both** invalidate
`debt(debtId)`, `debtsAll()`, `creditorSummary(creditorId)`, `debtMonths()` and `dashboards()`, each
asserted by key rather than by mutation success
**Gate**: `full`
**Commit**: `feat: add the debt payment hooks`

---

### Phase 4: Debt registration

```
T13 -> T14 -> T15
```

#### T13: Add the register debt form

**Where**: create `src/screens/RegisterDebt/RegisterDebtScreen.tsx`, `.styles.ts`, `.test.tsx`;
create `app/(app)/debts/new.tsx`
**What**: Name, creditor picker, person picker (preselected when the account has one Person, as the
existing forms do), category picker, mode control, principal amount, total amount, start date,
notes. Composes `Field`, `DateField`, `Picker`, `OptionChips`, `SelectSheet`, `SubmitButton`.
**Depends on**: T5, T11
**Requirement**: MDBT-02
**Tests**: the person is preselected when exactly one exists and a picker is shown when more than one
does; submitting sends the parsed numeric amounts, not the typed strings; an empty name and a
non-numeric amount are blocked before sending; the submit control is disabled while in flight; an
`ApiError` renders the API's messages and the form keeps its values
**Gate**: `full`
**Commit**: `feat: add the register debt form`

#### T14: Vary the form by mode

**Where**: modify `src/screens/RegisterDebt/RegisterDebtScreen.tsx` and its test
**What**: Choosing `OpenEnded` **hides** the installment count and due day fields and sends null for
both; choosing `Scheduled` shows them and requires both. The total amount defaults to the principal
as it is typed, and stops defaulting once the user edits it.
**Depends on**: T13
**Requirement**: MDBT-02
**Tests**: switching to open-ended removes both fields from the tree - asserted by their absence, not
by a disabled flag - and the submitted payload carries nulls for both; switching back restores them;
typing a principal of 1500 fills the total with 1500; editing the total to 1800 and then changing the
principal leaves the total at 1800
**Gate**: `full`
**Commit**: `feat: vary the debt form by scheduled or open-ended mode`

#### T15: Report what the API generated

**Where**: modify `src/screens/RegisterDebt/RegisterDebtScreen.tsx` and its test
**What**: On success, state how many installments were created, the amount of each and the month the
first one falls in - all read from the response's `installments`, never computed.
**Depends on**: T14
**Requirement**: MDBT-03
**Tests**: a response carrying ten installments of 150,00 whose first `referenceMonth` is 2026-04-01
produces a message naming ten, 150,00 and abril de 2026; a response whose installment amounts are
deliberately **not** the total divided by the count is reported with the API's amounts, which is what
proves nothing is recomputed; an open-ended response with zero installments reports the debt created
without naming a schedule
**Gate**: `full`
**Commit**: `feat: report the schedule the API generated`

---

### Phase 5: Debt payments

```
T16 -> T17 -> T18
```

#### T16: Add the record payment form

**Where**: create `src/screens/RecordDebtPayment/RecordDebtPaymentScreen.tsx`, `.styles.ts`,
`.test.tsx`; create `app/(app)/debts/payment.tsx`
**What**: Amount, payment date defaulting to today via `todayApiDate()`, optional type via
`OptionChips`, optional account picker, optional notes. Sends no reference month.
**Depends on**: T12
**Requirement**: MPAY-01
**Tests**: submitting for a scheduled installment sends the installment id and no reference month;
submitting for an open-ended debt sends `debtInstallmentId: null`; a null type and a null account are
accepted and sent as nulls; the date defaults to today; the submit control is disabled while in
flight
**Gate**: `full`
**Commit**: `feat: add the record debt payment form`

#### T17: Require an account for a credit payment

**Where**: modify `src/screens/RecordDebtPayment/RecordDebtPaymentScreen.tsx` and its test
**What**: Choosing Crédito makes the account required and blocks submission until one is chosen;
Débito and Pix leave it optional. If the API still answers `ACCOUNT_REQUIRED_FOR_CREDIT`, that
message is rendered - the client check saves a round trip, it does not replace the server rule.
**Depends on**: T16
**Requirement**: MPAY-02
**Tests**: Crédito with no account does not call the mutation and shows a message; Crédito with an
account submits; Débito with no account submits; Pix with no account submits; an `ApiError` carrying
`ACCOUNT_REQUIRED_FOR_CREDIT` renders the API's message verbatim
**Gate**: `full`
**Commit**: `feat: require an account for a credit debt payment`

#### T18: Route a second payment to correction

**Where**: modify `src/screens/RecordDebtPayment/RecordDebtPaymentScreen.tsx` and its test
**What**: When the chosen installment already carries a `paymentId`, the screen prefills from the
existing payment and calls `useCorrectDebtPayment` instead of `useRecordDebtPayment`.
**Depends on**: T17
**Requirement**: MPAY-02
**Tests**: an installment with a `paymentId` prefills the amount, date, type and account from the
existing payment and submits through the correction hook to `/debt/payment/{id}`; an installment
without one submits through the record hook to `/debt/payment`; an `ApiError` carrying
`PAYMENT_ALREADY_RECORDED` renders the API's message rather than a generic failure
**Gate**: `full`
**Commit**: `feat: correct an existing debt payment instead of duplicating it`

---

### Phase 6: Debt list, detail and month

```
T19 -> T20
T21 -> T22
```

#### T19: Add the debts list screen

**Where**: create `src/screens/Debts/DebtsScreen.tsx`, `.styles.ts`, `.test.tsx`; create
`app/(app)/debts/index.tsx`
**What**: Rows showing the debt name, creditor name, outstanding balance and paid-of-total progress.
Filters by creditor and by person, plus an inactive toggle reusing `ArchiveToggle`. Composes
`Screen`, `Loading`, `EmptyState`, `ErrorState`, `Money`.
**Depends on**: T3, T10
**Requirement**: MDTL-02
**Tests**: loading, empty and error states; each row's name, creditor and outstanding balance
rendered - **not** only the totals (lesson **L-004**); choosing a creditor filter refetches under a
different key; the inactive toggle refetches with `includeInactive` true; a press routes to the debt
detail with its id
**Gate**: `full`
**Commit**: `feat: add the debts list screen`

#### T20: Add the debt detail screen

**Where**: create `src/screens/DebtDetail/DebtDetailScreen.tsx`, `.styles.ts`, `.test.tsx`; create
`app/(app)/debts/[id].tsx`
**What**: Header with principal, total, outstanding balance and settled state; the schedule rendered
in the order received with a `DebtStatusBadge` per installment; the payments; an archive action; a
press on an installment routing to the payment screen with that installment's id.
**Depends on**: T3, T11, T18, T19
**Requirement**: MDTL-01
**Tests**: **a fixture whose `outstandingBalance` deliberately does not equal `totalAmount` minus the
sum of its payments renders the API's value** - this is the assertion that fails if the app ever
starts computing it; a settled debt renders its settled state from `isSettled` and not from the
balance's sign; installments render in the order received with their badges; pressing an installment
navigates to the payment route carrying its id; the archive action calls the mutation and the screen
handles the loading and error states
**Gate**: `full`
**Commit**: `feat: add the debt detail screen`

#### T21: Add the debt month screen

**Where**: create `src/screens/DebtMonth/DebtMonthScreen.tsx`, `.styles.ts`, `.test.tsx`; create
`app/(app)/debts/month.tsx`
**What**: One row per line with the debt name (the API calls it `name`), creditor, position as
number-of-count, due date, expected and paid amounts and a `DebtStatusBadge`. Month navigation
matching `ExpenseMonthScreen`. Pressing a scheduled line routes to the payment screen carrying the
line's `installmentId` — an open-ended line carries none and is not pressable that way.
**Depends on**: T3, T10, and the backend branch `fix/monthly-debt-line-installment-id`
**Requirement**: MVEW-01
**Tests**: loading, empty and error states; a scheduled line renders its position, due date, expected
and paid amounts; an open-ended line renders without a position or an expected amount rather than
showing zeroes; moving to the next month fetches under that month's own key; the empty state explains
what would appear there; pressing a scheduled line navigates with that line's `installmentId`, taken
from the response and not derived from its number
**Gate**: `full`
**Commit**: `feat: add the debt month screen`

#### T22: Render the month's totals and overdue markers

**Where**: modify `src/screens/DebtMonth/DebtMonthScreen.tsx` and its test
**What**: `totalExpected`, `totalPaid` and `totalCommitted` rendered from the response via `Money`,
and the overdue marker driven by each line's `isOverdue`.
**Depends on**: T21
**Requirement**: MVEW-02
**Tests**: the three totals render the API's values and **not** a sum recomputed from the lines, with
a fixture whose totals deliberately disagree with its lines; **a line whose `dueDate` is in the
future but whose `isOverdue` is true renders as overdue** - this is the assertion that fails if the
app ever starts comparing dates itself; a line with `isOverdue` false and a past due date renders no
marker
**Gate**: `full`
**Commit**: `feat: render the debt month totals and overdue markers`

---

### Phase 7: Dashboard and manual verification

#### T23: Add the debt block to the dashboard

**Where**: modify `src/types/dashboard.ts`, `src/screens/Dashboard/DashboardScreen.tsx` and its test,
`src/utils/dashboard/` if a selector is involved
**What**: `debts: MonthlyDebt` added to the dashboard response type; a fourth block showing the
month's `totalCommitted` with its paid share, pressable to the debt month for the same month.
`balance` is still rendered exactly as the API returned it.
**Depends on**: T1, T21
**Requirement**: MDSH-01
**Tests**: the debt block renders `totalCommitted` from the response; **the balance rendered equals
the API's `balance` field even in a fixture where income minus expenses minus debts would give a
different number** - the subtraction happened on the server; pressing the block navigates to the debt
month with the same year and month; a month with no debts renders the block with zeroes rather than
hiding it; loading and error states behave as the dashboard already does
**Gate**: `full`
**Commit**: `feat: show the month's debts on the dashboard`

#### T24: Verify the feature against the live API

**Where**: no source change expected
**What**: With the backend running and Docker up, exercise the whole flow in Expo: create a creditor,
register 1500,00 over 10 from the 20th with due day 10, confirm ten installments of 150,00 starting
the following month, pay installment 1 by pix, confirm the outstanding balance drops to 1350,00 on
the detail, the list and the creditor summary without a manual reload, confirm the debt month and the
dashboard both reflect it, then archive the debt and confirm it leaves the list and the month.
**Depends on**: T23
**Requirement**: every requirement
**Tests**: manual, against real PostgreSQL. The in-memory provider proves logic, not real database
behaviour - the expense feature's ordering defect reached production precisely because every
automated test used a hand-built fixture whose order was already what the code assumed
**Gate**: `web`, then `full`
**Commit**: none unless a defect is found; a fix commits under its own message

---

## Self-Review

**Spec coverage.** Every requirement in the spec's traceability table maps to at least one task:
MCRD-01 → T1, T2, T5; MCRD-02 → T6, T8, T9; MDBT-01 → T1, T10, T11; MDBT-02 → T4, T9, T13, T14;
MDBT-03 → T15; MPAY-01 → T12, T16; MPAY-02 → T17, T18; MPAY-03 → T2, T12;
MVEW-01 → T21; MVEW-02 → T3, T22; MDTL-01 → T20; MDTL-02 → T11, T19; MDTL-03 → T7;
MDSH-01 → T23. No gaps.

**Type consistency.** `RegisterDebtInput`, `RecordDebtPaymentInput` and `CorrectDebtPaymentInput`
(T10–T12) are the exact names T13, T16 and T18 consume. `DebtStatusBadge` (T3) takes `status` and
`isOverdue`, which is what T19, T20 and T21 pass. `qk.debtMonths()` and `qk.dashboards()` (T2) are
the keys T11 and T12 invalidate and T22 and T23 read.

**Placeholder scan.** No task defers work, and every `Tests` field names concrete cases with concrete
values.

**The four assertions that carry MAD-001.** T15 (installment amounts that are not the total divided
by the count), T20 (an outstanding balance that does not reconcile), T22 (an overdue flag that
contradicts the due date) and T23 (a balance that is not income minus expenses minus debts) each use
a fixture built so that a client-side computation would produce a *different* answer than the API's.
Without those deliberately inconsistent fixtures, a recomputation would pass every test.
