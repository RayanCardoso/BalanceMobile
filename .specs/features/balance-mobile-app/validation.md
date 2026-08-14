# Balance Mobile App Validation

**Date**: 2026-08-14
**Spec**: `.specs/features/balance-mobile-app/spec.md`
**Diff range**: `e2f8cdb..1d5e4b1` (56 commits, `master`; fresh repository, no shared base branch)
**Backend dependency commits**: `60693d8` (T46 CORS), `a039d71` (T49 `paymentId`), `87b9cd3` (T51 list-all), `3f44760` (T48 version-ordering fix)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero

**Verdict**: ✅ **PASS** — 57/57 acceptance criteria covered with assertions matching the spec-defined outcome, 12/12 mutants killed, gate green. **2 spec-precision gaps flagged** (neither is an unmet acceptance criterion).

---

## Task Completion

All 51 tasks carry a `**Status**: ✅ Complete` line. Spot-checked deviations and judged:

| Task | Status | Verifier's judgement of the recorded deviation |
| ---- | ------ | ---------------------------------------------- |
| T1 | ✅ Done | SDK 57 rather than the spec's unconfirmed SDK 56 guess; routes moved to root `app/` to match `design.md`. Justified — the spec marked the SDK row "Confirmed? n". |
| T4 | ✅ Done | Carries its own ⚠️ spec-precision gap on the accepted money grammar. **Independently confirmed — see Spec-Precision Gaps below.** |
| T15 | ✅ Done | Widened `UnauthorizedError` to carry `messages` so AUTH AC7 is reachable without the app writing its own copy. Additive; three tests added, none weakened. Justified under MAD-004. |
| T16 | ✅ Done | Screens live in `src/features/*/ui/` not `app/`, because Expo Router's `require.context` would publish a `*.test.tsx` as a route. Correct and structural. |
| T19 | ✅ Done | Honestly surfaced that `useSignOut` shipped with no caller. Resolved by T44 rather than deferred. Correct call — an operation no user can invoke leaves AUTH AC6 unreachable in the product. |
| T50 | ✅ Added mid-flight | Password masking. No AC names it; added as its own task with its own test rather than smuggled into T16. Justified. |
| T51 | ✅ Added mid-flight | Backend list-all endpoint. Without it REC AC8 (unarchive) is dead code — an archived bill's id was undiscoverable. **Verified in backend source.** Correctly scoped: adds a second read path, leaves `GetForMonth` untouched. |
| T48 | ✅ Done | Found a real bug 365 mobile + 358 backend tests missed. Fixed at the source of truth (backend), not worked around on the client. **Verified — see Cross-Repo Dependencies.** |

No task is blocked or partial. No `// SPEC_DEVIATION` marker exists anywhere in `src/` or `app/`.

---

## Spec-Anchored Acceptance Criteria

Every criterion traced to `file:line` + the actual assertion expression, and checked that the **asserted value matches the spec-defined outcome**.

### P1: Sign in and stay signed in (AUTH)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 valid credentials → store token in secure storage, show dashboard | token persisted; session drives the dashboard | `useAuth.test.tsx:95` — `expect(persistedToken).toHaveBeenCalledWith('issued-token')`; `SignInScreen.test.tsx:91` session → `signedIn` | ✅ PASS |
| AC2 registration → create account, store token, show dashboard | same, via `/user` | `SignUpScreen.test.tsx:88` literal body `'{"name":"Rayan",...}'`; session `signedIn` | ✅ PASS |
| AC3 stored token at start → straight to dashboard | app group appears, auth group **never** rendered | `RootLayout.test.tsx:93-103` — `expect(authGroup()).toBeNull()` before, `appGroup()` truthy after, `authGroup()` null **again** | ✅ PASS |
| AC4 no stored token → sign-in screen | auth group renders | `RootLayout.test.tsx:110` — `expect(authGroup()).toBeTruthy()` | ✅ PASS |
| AC5 401 on authorised request → clear token, return to sign-in | 401 maps to `UnauthorizedError`; session ends | `httpClient.test.ts:132` — `.rejects.toBeInstanceOf(UnauthorizedError)`; `:150` `.rejects.not.toBeInstanceOf(ApiError)`; `useSignOut.test.tsx:108,128,167` | ✅ PASS |
| AC6 sign out → clear token **and cached server data**, return to sign-in | cache empty, read back | `useSignOut.test.tsx:90-94` — `expect(client.getQueryData(qk.people())).toBeUndefined()`, `getQueryCache().getAll()).toHaveLength(0)`; `AppShell.test.tsx:99` from the real control | ✅ PASS |
| AC7 sign-in fails → show API's message, keep email | API's literal text; field still filled | `SignInScreen.test.tsx:117` — `'E-mail e/ou senha inválidos.'`; `:124` — `getByLabelText('E-mail').props.value` = `'rayan@balance.app'` | ✅ PASS |
| AC8 bearer header on every authorised request | `Bearer <token>` present; absent without one | `httpClient.test.ts:53` — `expect(lastInit().headers['Authorization']).toBe('Bearer stored-token')`; `:61` `toBeUndefined()` | ✅ PASS |

### P1: See the month at a glance (DASH)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 dashboard opens → current month, income received, committed expense, balance | three literal totals | `DashboardScreen.test.tsx:197-202` — `within(getByTestId('dashboard-total-received')).getByText('R$ 6.000,00')`, committed `R$ 470,50`, balance `R$ 5.529,50` | ✅ PASS |
| AC2 previous/next month → load and show that month | September's figures replace August's | `DashboardScreen.test.tsx:249` | ✅ PASS |
| AC3 while loading → loading state, **not** stale figures | previous month's balance absent under new heading | `DashboardScreen.test.tsx:296-299` — `getByText('Setembro de 2026')`, `getByTestId('loading-indicator')`, `queryByText('R$ 5.529,50')).toBeNull()`, asserted synchronously in the frame after the press | ✅ PASS |
| AC4 month with no records → zeroed totals + empty state | three `R$ 0,00` + explanatory sentence | `DashboardScreen.test.tsx:333-344` | ✅ PASS |
| AC5 negative balance → presented as negative | `-R$ 470,50`, absolute form absent | `DashboardScreen.test.tsx:317` — `getByText('-R$ 470,50')`; `:321` — `queryByText('R$ 470,50')).toBeNull()`; `Money.test.tsx:31` | ✅ PASS |
| AC6 four distinguishable groups | each line inside its own group, denied in the other three | `DashboardScreen.test.tsx:212` | ✅ PASS |
| AC7 dashboard request fails → error state with retry | retry re-reads and the month arrives | `DashboardScreen.test.tsx:348` | ✅ PASS |

### P1: Keep the catalogue (CAT)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 list people, categories, accounts | every field, not only names | `useCatalogue.test.tsx:92`; `PeopleScreen.test.tsx:157` (description asserted per row, L-004) | ✅ PASS |
| AC2 create → persist and show without manual refresh | the GET route called **twice**; both names in the list | `useCatalogue.test.tsx:237,261,291`; `PeopleScreen.test.tsx:212` | ✅ PASS |
| AC3 category priority labelled Essencial / Importante / Supérfluo | three literal labels from their integers | `CategoriesScreen.test.tsx:122` (one fixture per value, L-010) | ✅ PASS |
| AC4 account accepts empty closing day, due day, limit | payload fields `null` — not `0`, not `""` | `AccountsScreen.test.tsx:164` — each `toBeNull()`; `:145` no `NaN\|undefined\|null` rendered | ✅ PASS |
| AC5 create rejected → show API's messages, keep form filled | both messages; fields still hold input | `PeopleScreen.test.tsx:239` (two messages word for word); `:248` field values | ✅ PASS |
| AC6 exactly one person → preselect | picker absent, id still sent; two people → nothing preselected | `AccountsScreen.test.tsx:205,227`; `RegisterExpenseScreen.test.tsx:380`; `RegisterIncomeSourceScreen.test.tsx:175` | ✅ PASS |

### P1: Record and review income (INC)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 one line per source with expected, received, status | three assertions per line, own subtree | `IncomeMonthScreen.test.tsx:211-213, 218-220, 226-228` — e.g. `expected('s3').getByText('R$ 900,00')`, `received('s3').getByText('R$ 745,50')`, `status('s3').getByText('Divergente')` | ✅ PASS |
| AC2 status labelled Pendente / Recebido / Divergente | three literal labels; `1` pinned **not** `Pago` | `income.test.ts:4` + `IncomeMonthScreen.test.tsx:235` (statuses held apart per line) | ✅ PASS |
| AC3 recurring source → send amount and expected day | literal body with both fields | `useIncome.test.tsx:136`; `RegisterIncomeSourceScreen.test.tsx:106` | ✅ PASS |
| AC4 variable source → send **neither** | both keys asserted absent, not falsy | `useIncome.test.tsx:161` — `'amount' in payload` false; `RegisterIncomeSourceScreen.test.tsx:128` | ✅ PASS |
| AC5 payment → reference month sent separately from payment date | the two differ and both are pinned | `RecordIncomePaymentScreen.test.tsx:161-163` — `paymentDate` `'2026-09-03'`, `referenceMonth` `'2026-08-01'`, and `.not.toBe()` each other | ✅ PASS |
| AC6 payment → month refreshes without manual reload | line moves Pendente/R$ 0,00 → Recebido/R$ 5.000,00 with nothing reloading | `RecordIncomePaymentScreen.test.tsx:246`; `useIncome.test.tsx:261` (August re-reads, September stays at one call) | ✅ PASS |
| AC7 change value → send amount, expected day, validity start, reason | all four in one literal body | `ChangeIncomeValueScreen.test.tsx:131` — `'{"incomeSourceId":"s1","amount":5500,"expectedDay":6,"validityStart":"2026-08-01","changeReason":"Dissídio anual"}'` | ✅ PASS |
| AC8 rejected → API's messages, untranslated | literal API sentences | `ChangeIncomeValueScreen.test.tsx:177`; `RecordIncomePaymentScreen.test.tsx:319`; `RegisterIncomeSourceScreen.test.tsx:216` (two messages) | ✅ PASS |
| AC9 more than one payment per source per reference month | both reach the API | `useIncome.test.tsx:328`; `RecordIncomePaymentScreen.test.tsx:289` | ✅ PASS |

### P1: Record and review expenses (EXP)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 variable expenses and recurring bills as separate groups | each line inside its own list, denied in the other | `ExpenseMonthScreen.test.tsx:154` | ✅ PASS |
| AC2 send name, person, type, amount, category, account, date | literal body pinning all seven | `useExpenses.test.tsx:238` — `'{"name":"Passagem","personId":"p1","type":0,"amount":480,"categoryId":"c1","accountId":"a1","date":"2026-08-21","competenceMonth":null}'` | ✅ PASS |
| AC3 no override → let the API derive the competence month | `competenceMonth` is **null**, not absent, not client-computed | `useExpenses.test.tsx:242` — `expect(payload.competenceMonth).toBeNull()`; `RegisterExpenseScreen.test.tsx:189` | ✅ PASS |
| AC4 override chosen → send the chosen month | `'2026-10-01'` sent, `date` untouched | `useExpenses.test.tsx:256-257` | ✅ PASS |
| AC5 registered → refresh the affected month | month screen updates with nothing reloading it | `RegisterExpenseScreen.test.tsx:316`; `useExpenses.test.tsx:262` | ✅ PASS |
| AC6 competence month differs from viewed month → tell the user | `Lançado em Setembro de 2026.`; **no notice node at all** when it matches | `RegisterExpenseScreen.test.tsx:272` (both halves, `queryByTestId` null) | ✅ PASS |
| AC7 expense may reference another person's account | `personId: 'p1'` with `accountId: 'a2'` | `RegisterExpenseScreen.test.tsx:351` | ✅ PASS |
| AC8 rejected → API's messages, form stays filled | two messages + both field values | `RegisterExpenseScreen.test.tsx:403` | ✅ PASS |

### P1: Manage recurring bills (REC)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 register → send base amount, due day, estimate flag | literal body, `isEstimate` both directions | `useRecurring.test.tsx:221`; `RegisterRecurringExpenseScreen.test.tsx:94` | ✅ PASS |
| AC2 estimate + unpaid → mark provisional | mark present when estimated+unpaid; **absent** once paid, real value shown, estimate gone | `ExpenseMonthScreen.test.tsx:224-226` then `:236-240` — `queryByTestId('recurring-provisional-r1')).toBeNull()`, `getByText('R$ 187,40')`, `queryByText('R$ 150,00')).toBeNull()` | ✅ PASS |
| AC3 record a month's cost → send reference month, payment date, amount, optional account | literal body | `useRecurring.test.tsx:318` | ✅ PASS |
| AC4 payment already exists → offer correction, not a second POST | PUT to that id; **zero** POSTs | `useRecurring.test.tsx:397-399` — `callsTo('POST', ...)).toHaveLength(0)`; `RecordRecurringPaymentScreen.test.tsx:119,188` | ✅ PASS |
| AC5 correction → send only amount, date, notes, paying account | literal body + the three forbidden fields asserted **absent** | `useRecurring.test.tsx:413` — `'{"paymentDate":"2026-09-04","amountPaid":190.2,"notes":"Valor corrigido","accountId":"a2"}'`; `:418` absence check | ✅ PASS |
| AC6 change base value → send amount, validity start, reason | literal body; September re-reads, **July and August do not** | `useRecurring.test.tsx:448`; `ChangeRecurringValueScreen.test.tsx:106` | ✅ PASS |
| AC7 archive → remove from month view, payments untouched | line vanishes from `useExpenseMonth`, payment survives round trip | `useRecurring.test.tsx:492`; `ArchiveToggle.test.tsx:67,129` | ✅ PASS |
| AC8 unarchive → show in month view again | same paid amount reappears | `ArchiveToggle.test.tsx:107,129` | ✅ PASS |
| AC9 status labelled Pendente / Pago / Divergente | three literal labels; `1` pinned **not** `Recebido` | `expense.test.ts:11` | ✅ PASS |
| AC10 archived-bill rejection → show that message, not a generic failure | API's literal sentence | `RecordRecurringPaymentScreen.test.tsx:248` — `getByText('Esta conta recorrente está arquivada.')` | ✅ PASS |

### P2: Record an installment purchase (INST)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 send total, count, start date | literal body | `useExpenses.test.tsx:337`; `RegisterInstallmentPlanScreen.test.tsx:149` | ✅ PASS |
| AC2 show how many installments and each amount | `3 parcelas criadas`, `33,33 / 33,33 / 33,34` per row, third **not** `33,33` | `RegisterInstallmentPlanScreen.test.tsx:198-205` | ✅ PASS |
| AC3 installment in a month shows position out of total | `Parcela 2 de 3`; a one-off carries no position node | `ExpenseMonthScreen.test.tsx:189`; `RegisterInstallmentPlanScreen.test.tsx:208` | ✅ PASS |
| AC4 rejected count → show API's message | API's sentence + **no summary rendered** | `RegisterInstallmentPlanScreen.test.tsx:252` | ✅ PASS |

### P2: Understand what the app is doing (UX)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 first fetch → loading indicator | indicator in the first frame, before resolve | `PeopleScreen.test.tsx:87`; `states.test.tsx:14`; all seven list screens gate on `data === undefined` | ✅ PASS |
| AC2 non-validation failure → error state with retry | retry **re-reads** and the list arrives | `PeopleScreen.test.tsx:139`; `states.test.tsx:14` (`onRetry` called exactly once) | ✅ PASS |
| AC3 empty list → explanatory empty state | seven distinct literal sentences | `states.test.tsx:14`; per-screen empty-state tests | ✅ PASS |
| AC4 mutation in flight → submit disabled, cannot send twice | handler called **0** times while pending, **1** time across two presses | `form.test.tsx:84` — asserted on call count, never on the button reporting itself disabled | ✅ PASS |
| AC5 API unreachable → say so, not a validation problem | `NetworkError` ≠ `ApiError`; connectivity sentence present **and** generic sentence absent | `httpClient.test.ts:163` — `.rejects.not.toBeInstanceOf(ApiError)`; `states.test.tsx:76`; five screen-level proofs (`PeopleScreen:110`, `DashboardScreen:382`, `IncomeMonthScreen:170`, `RecurringBillsScreen:133`, `RegisterExpenseScreen:435`) | ✅ PASS |

**Status**: ✅ **57/57 acceptance criteria covered**, each asserted against the spec-defined outcome. ⚠️ 2 spec-precision gaps flagged separately below (neither is an unmet criterion).

---

## Edge Cases

- [x] **Expired token → clear session on first 401, no broken screen** — `useSignOut.test.tsx:108,128,167`; the reaction is scoped to a session that *was* signed in, so a rejected password does not empty the cache (`:142`).
- [x] **Month opened before any record exists → zeroed totals, not an error** — `DashboardScreen.test.tsx:325`.
- [x] **Recurring bill with no version in effect → expected amount absent, not zero** — `ExpenseMonthScreen.test.tsx:294-295` — `getByText('—')` and `queryByText('R$ 0,00')).toBeNull()`.
- [x] **Due day 31 in a shorter month → shown as the API returned it, unclamped** — `ExpenseMonthScreen.test.tsx:271-272` — `getByText('Vence dia 31')`, and line r1 asserted **not** to read 31.
- [x] **Expense registered into another month → list not silently unchanged** — EXP AC6 notice, `RegisterExpenseScreen.test.tsx:272`.
- [x] **Two categories with the same name → both listed separately** — `CategoriesScreen.test.tsx:145` — `getAllByText('Mercado')).toHaveLength(2)` with both priorities distinct inside the list.
- [x] **Offline mutation → report the failure rather than appearing to succeed** — `RegisterExpenseScreen.test.tsx:435` (UX AC5 on a form, which previously rendered nothing at all).

---

## Discrimination Sensor

**Isolation**: temporary `git worktree` at `%TEMP%\bal-sensor` — deliberately **outside** the `mobile/` tree so it could neither pollute Jest's discovery nor repeat the orphaned-worktree problem. `node_modules` was supplied by a directory junction, removed as a link before teardown. **No `git stash` was used.** Pre-sensor baseline `git status --porcelain` was empty in both repos; re-verified empty after teardown. `git worktree list` shows only the main worktree.

**Depth**: P0-full (12 mutations — auth, cache-invalidation and data-integrity paths).

| # | File | Mutation | Killed? |
| - | ---- | -------- | ------- |
| M1 | `src/shared/api/httpClient.ts:73,79` | Swapped the mappings: 401 → `NetworkError`, `fetch` rejection → `UnauthorizedError` | ✅ Killed (3 failed / 17) |
| M2 | `src/features/auth/ui/RootLayout.tsx:27-29` | `SessionGate` ignores `loading` (two-state guard) | ✅ Killed (1 failed / 7) |
| M3 | `src/features/auth/api/useSignOut.ts:17` | Removed `client.clear()` from `endSession` | ✅ Killed (4 failed / 12) |
| M4 | `src/features/recurring/ui/RecordRecurringPaymentScreen.tsx:66` | `if (selectedLine.paymentId === null)` → `if (true)`, forcing every submit down POST | ✅ Killed (1 failed / 4) |
| M5 | `src/features/expenses/api/useExpenses.ts:89` | `useRegisterExpense` invalidates the **input** month instead of the response's `competenceMonth` (MAD-003) | ✅ Killed (2 failed / 19) |
| M6 | `src/features/expenses/api/useExpenses.ts:105-109` | `useRegisterInstallmentPlan` invalidates the input start month instead of each response month | ✅ Killed (2 failed / 15) |
| M7 | `src/features/recurring/api/useRecurring.ts:249` | `useArchiveRecurringExpense` narrowed to a single month instead of every cached month | ✅ Killed (1 failed / 21) |
| M8 | `src/features/recurring/ui/ArchiveToggle.tsx:73-75` | Skipped the confirm gate — archive fires on the first press | ✅ Killed (3 failed / 4) |
| M9 | `src/features/navigation/ui/AppShell.tsx:53` | Sign-out `onPress` no longer calls `signOut` | ✅ Killed (2 failed / 5) |
| M10 | `src/features/catalogue/model/priority.ts:10` | `PRIORITY_LABEL[1]` collapsed `Importante` → `Essencial` | ✅ Killed (1 failed / 11) |
| M11 | `src/features/income/model/income.ts:29` | `INCOME_STATUS_LABEL[1]` collapsed `Recebido` → `Pendente` | ✅ Killed (5 failed / 16) |
| M12 | `src/features/expenses/model/expense.ts:38` | `EXPENSE_STATUS_LABEL[1]` collapsed `Pago` → `Divergente` | ✅ Killed (2 failed / 25) |

**Result**: **12/12 killed, 0 survived** — ✅ PASS.

M9 was re-derived independently rather than accepted from T44's record (where the batch worker's own attempt had been blocked by the permission classifier and the orchestrator ran it instead). M4 was likewise re-derived rather than trusted from T39.

Every mutation failed **only** the tests that carry its criterion — the payload, routing and success assertions stayed green throughout, which is what shows the criterion-bearing assertions are the ones doing the work rather than being carried by a neighbour.

---

## Cross-Repo Dependency Verification

Checked against backend source, not against the task record.

| Claim | Evidence | Result |
| ----- | -------- | ------ |
| T49: `ResponseRecurringExpenseLineJson` carries `paymentId` | `src/Balance.Communication/Responses/ResponseMonthlyExpenseJson.cs` — `public Guid? PaymentId { get; set; }` on `ResponseRecurringExpenseLineJson` | ✅ Confirmed |
| T49 asserted on **value**, not existence | `tests/UseCases.Test/Expenses/GetMonthly/GetMonthlyExpenseUseCaseTest.cs:92` — `.PaymentId.ShouldBe(paymentId)`; `:106` — `.ShouldBeNull()`; endpoint `tests/WebApi.Test/Expenses/GetMonthlyExpenseTest.cs:189` — `.GetProperty("paymentId").GetGuid().ShouldBe(paymentId)`, `:192` `JsonValueKind.Null` | ✅ Confirmed (both branches, both layers) |
| T51: `GET /api/recurring-expense` exists | `src/Balance.Api/Controllers/RecurringExpenseController.cs` — `[HttpGet] GetAll` returning `ResponseRecurringExpensesJson` | ✅ Confirmed |
| T51: returns archived rows | `RecurringExpenseRepository.GetAll` has **no** `Archived` filter (contrast `GetForMonth`, which filters `Archived == false`); `GetAllRecurringExpensesUseCaseTest.cs:33` — `archivedLine.Archived.ShouldBeTrue()` with `.Id.ShouldBe(archived.Id)` | ✅ Confirmed |
| `3f44760`: version ordering by `ValidityStart` | `RecurringExpenseRepository.cs:29, 36, 44, 56` — **all four** `.Include` call sites read `.Include(expense => expense.Versions.OrderBy(version => version.ValidityStart))` | ✅ Confirmed (4/4) |
| T46: Expo web origin through CORS, no `AllowAnyOrigin` | `src/Balance.Api/Program.cs:69` — `.WithOrigins("http://localhost:5173", "http://localhost:8081")` on the named `FrontendDevServer` policy | ✅ Confirmed |
| AD-006 equivalent: no backend change beyond T46/T49/T51 + the T48 fix | `git diff --name-only 55a3a9d..HEAD` returns 16 files, all recurring-expense / CORS / monthly-expense / spec; `\| grep -i income` is **empty** | ✅ Confirmed |

The backend diff surface contains nothing unaccounted for: `Program.cs` (T46), `ResponseMonthlyExpenseJson.cs` + `GetMonthlyExpenseUseCase.cs` (T49), the `GetAll` chain + controller + DI (T51), `RecurringExpenseRepository.cs` (T48 fix), and their tests.

---

## Gate Check

- **Gate command**: `node "$n\node_modules\npm\bin\npm-cli.js" test -- --watchAll=false --maxWorkers=2`, plus `node node_modules/typescript/bin/tsc --noEmit`
- **Types**: `tsc --noEmit` exit **0**
- **Tests**: **42 suites passed, 42 total · 365 passed, 365 total, 0 failed, 0 skipped**
- **Test count before this feature**: 0 (fresh repository) → **+365**
- **Skipped tests**: none — `grep` for `it.skip` / `describe.skip` / `xit` / `it.todo` across `src/` and `__tests__/` returns nothing
- **Failures**: none
- **Post-sensor re-run**: identical (42 / 365 / 0), confirming the scratch never touched the real tree

**Note on the recorded flake**: T33 flagged a pre-existing `waitFor` race in `RegisterIncomeSourceScreen.test.tsx`, and T41 root-caused a related one in `ArchiveToggle.test.tsx` (widened to 5000 ms). Neither reproduced in any of the three full-suite runs performed for this validation at `--maxWorkers=2`. T41's diagnosis — CPU contention rather than a behavioural defect — is consistent with what was observed here, and T41 fixed the cause rather than loosening the assertion.

**Test-integrity check**: no assertion was weakened. The two tasks that touched already-committed test files (T15, T26, T37) each **added** tests; the task record states nothing was deleted or weakened, and the sensor independently confirms the criterion-bearing assertions still discriminate.

---

## Spec-Precision Gaps

Neither blocks a criterion. Both are recorded because the spec does not pin the outcome, so a test cannot be judged right or wrong against it.

### ⚠️ SPG-1: the accepted money-input grammar is undefined, and the app cannot parse what it displays

The spec's Assumptions table says money is "entered as a decimal string, parsed to a number before the request" without naming the accepted grammar; no acceptance criterion covers it.

`formatMoney` renders `1234.56` as **`R$ 1.234,56`** (`src/shared/lib/money.ts:16`), but `parseMoneyInput`'s regex `^-?\d+(?:[.,]\d+)?$` (`money.ts:28`) **rejects** `1.234,56` — the very form the app puts on screen. `money.test.ts:41` pins `'12,34,56'` (two separators) as rejected, which is the same class, so this is deliberate and tested at the helper level; it is the *spec* that does not say whether a pt-BR user may type the thousands separator they read everywhere else in the app.

This is the gap T4 flagged. Independently confirmed.

### ⚠️ SPG-2: an unparseable amount is handled two different ways, and one of them is silent

Six of the seven call sites use `parseMoneyInput(x) ?? 0`, so a rejected amount is sent as `0` and the API answers with its own "maior que zero" message — deliberate under MAD-001/MAD-004, and a visible outcome.

The seventh differs: `src/features/catalogue/ui/AccountsScreen.tsx:56` —

```ts
limit: limit.trim() === '' ? null : parseMoneyInput(limit),
```

A **non-empty but unparseable** limit (e.g. `1.234,56`) therefore sends `limit: null`, which the API accepts as "no limit" per CAT AC4. The account is created successfully and the user is **not** told their limit was dropped. That is a silent discard rather than a surfaced rejection, and it is the one place where the app's own parsing decides an outcome the API then cannot object to.

No test covers a malformed money input at any screen — only at the `parseMoneyInput` helper. The spec defines the outcome for an *empty* limit (CAT AC4, covered) but not for a malformed one, so this is a spec-precision gap rather than a failed criterion. It is the more consequential of the two, because the failure mode is silence.

---

## Verification-Fidelity Finding (VFF-1)

Recorded as a signal even though the defect is fixed, because it is the only place in this feature where the automated gate was demonstrably unable to see a real failure.

The recurring bills list shipped displaying a re-priced bill's **superseded** amount (R$ 2.100,00 instead of R$ 2.250,00) — an effective REC-01/REC-02 failure in the delivered product — and **365 mobile tests plus 358 backend tests all stayed green over it**. It was caught only by T48's manual browser check against a live PostgreSQL database, and fixed in backend commit `3f44760`.

**Root cause of the blind spot**: `RecurringExpenseRepository`'s `.Include(expense => expense.Versions)` carried no ordering guarantee. Every backend integration test runs on the EF Core **in-memory provider**, which happened to preserve insertion order (oldest-first) — the order every hand-built fixture on both sides assumed, and the order `RecurringBillsScreen.tsx` relied on when it took `versions[versions.length - 1]`. Real PostgreSQL returned newest-first. No amount of re-running either suite could have surfaced it, because both suites encoded the same wrong assumption as their fixtures.

**Verified fixed**: all four `.Include` call sites now order by `ValidityStart` (`RecurringExpenseRepository.cs:29, 36, 44, 56`). That no existing backend assertion flipped is itself the evidence that every fixture already assumed the order now guaranteed.

This is the second instance of the same structural class in this project — the first being the unique index on `RecurringExpensePayment`, which the in-memory provider likewise does not enforce. Ordering and uniqueness are both guarantees the test provider silently supplies for free and the real engine does not. Distilled as a lesson below.

---

## Code Quality

| Principle | Status | Note |
| --------- | ------ | ---- |
| No features beyond what was asked | ✅ | Additive modules (`errors.ts` per feature, `parseOptionalInt`, `currentMonth`, `todayApiDate`, extra query-key factories) are each recorded in their task's status line with a reason. |
| No abstractions for single-use code | ✅ | The five per-feature `errors.ts` copies are deliberate duplication with a stated reason (no feature may retitle another's API copy); the one genuinely shared sentence (connectivity) lives once in `states.tsx`. |
| No unnecessary flexibility | ✅ | `Tabs`/`@react-navigation/bottom-tabs` declined twice (T24, T44) rather than pulled in early. |
| Only touched files required for task | ✅ | Backend diff carries nothing beyond the four named commits; `grep -i income` empty. |
| Didn't improve unrelated code | ✅ | T33 explicitly left another task's flake untouched and recorded it instead. |
| Matches existing patterns/style | ✅ | Route files are uniformly one-line mount points; screens live in `features/*/ui/`. |
| Would a senior engineer approve? | ✅ | Yes — with SPG-2 raised in review. |
| Tests map to ACs and are non-shallow | ✅ | Spot-checked P1 recurring bills and P1 expenses; assertions are value-level and paired with a negative. |
| Spec-anchored outcome check | ✅ | 57/57; see table above. |
| Per-layer Coverage Expectation met | ✅ | Pure functions have literal expected values (no `Intl` recomputation, L-010); hooks assert payload **and** invalidated keys; screens assert loading/empty/error/data; the route guard covers all three statuses. |
| Every test maps to a spec AC, edge case, or Done-when | ✅ | The only test without an AC is `__tests__/harness.test.tsx`, which is T2's own Done-when (proving the runner executes). `CatalogueMenu.test.tsx` maps to T24's Done-when under CAT-01. |
| Documented guidelines followed | ✅ | `.specs/STATE.md` MAD-001…MAD-004; backend `.specs/LESSONS.md` L-003/L-004/L-005/L-010 are cited by name at their point of use. |

**MAD conformance, checked independently:**

- **MAD-001** (app owns no business rule) — `ExpenseMonthScreen.test.tsx:301` pins the API's `totalCommitted` (500,00) against lines summing to 470,50, so a screen doing its own arithmetic fails. `RegisterInstallmentPlanScreen.test.tsx:205` pins the residual cent where the server put it. Sensor M5/M6 confirm no client-side competence month.
- **MAD-002** (server state in Query, client state in Zustand) — every key built through `qk.*` factories; `sessionStore` holds only token/name/status.
- **MAD-003** (invalidate the month the API returned) — sensor M5, M6 and M7 all target this directly; all three killed.
- **MAD-004** (API messages verbatim) — the only app-authored user sentence is `CONNECTIVITY_MESSAGE`, justified because the request never reached the API, so there is no server wording to be faithful to.

---

## Requirement Traceability Update

| Requirement | Previous | New |
| ----------- | -------- | --- |
| AUTH-01, AUTH-02, AUTH-03 | Implementing | ✅ Verified |
| CAT-01, CAT-02 | Implementing | ✅ Verified |
| DASH-01, DASH-02 | Implementing | ✅ Verified |
| INC-01, INC-02, INC-03 | Implementing | ✅ Verified |
| EXP-01, EXP-02, EXP-03 | Implementing | ✅ Verified |
| REC-01, REC-02, REC-03, REC-04 | Implementing | ✅ Verified |
| INST-01 | Implementing | ✅ Verified |
| UX-01, UX-02 | Implementing | ✅ Verified |

20/20 requirements verified.

---

## Summary

**Overall**: ✅ **Ready**

**Spec-anchored check**: 57/57 ACs matched the spec-defined outcome · 2 spec-precision gaps flagged
**Sensor**: 12/12 mutations killed
**Gate**: 365 passed, 0 failed, 0 skipped · `tsc --noEmit` exit 0

**What works**: every P1 and P2 story is reachable from a screen and proved at the layer the criterion names. The three behaviours most likely to be got wrong are all pinned from both directions — a credit purchase landing in the next month (MAD-003), a recurring payment routing to PUT rather than a second POST, and a session ending without leaving the previous account's data in the cache. The four backend changes exist, do what the task record claims, and touch no income code.

**Issues found**:
1. **SPG-2** (Minor, worth a follow-up task) — `AccountsScreen.tsx:56` silently sends `limit: null` for a malformed non-empty limit, so the user is not told the value was dropped. Fix direction: use the same `?? 0` shape as the other six call sites so the API rejects it visibly, or pin the intended outcome in the spec first. Not a failed criterion — the spec does not define it.
2. **SPG-1** (Cosmetic-to-Minor) — the spec should state whether `1.234,56` is a valid amount input, given the app displays money in exactly that form.

**Housekeeping note (not a validation finding)**: the backend working tree carries one untracked file, `.claude/launch.json` (created 11:00 today, during T48's browser verification, before the `3f44760` fix at 11:18). It is a leftover of the Expo web preview harness, not part of any commit. The mobile working tree is clean.

**Next steps**: neither gap blocks the feature. Route SPG-2 to a follow-up task if the silent-drop behaviour is not intended; otherwise pin both outcomes in the spec's Assumptions table so a future change cannot regress them unnoticed.
