# Debt Tracking (Mobile) Specification

## Problem Statement

The app records what the household earns and what it spends. It has no place for what the household
*owes*. The user borrows 1500 from their father and repays it in ten, or carries a bank loan with a
fixed monthly obligation for two years, and today the only way to see either in Balance is to type
ten separate expenses and hope to remember which ones belonged together.

Debt has a shape the existing screens cannot borrow. It has a counterparty the user thinks in terms
of - "how much do I still owe my father" is the question, not "how much did I spend on category
Loans". It has a schedule that may run for years, so the month view alone never shows the whole
thing. And its payment method is chosen at the moment of paying, which means the register form and
the payment form ask for different things - the opposite of how the expense screens work today.

This feature consumes the backend's `debt-tracking` API. Per MAD-001 the app computes none of it: no
schedule generation, no outstanding balance, no overdue rule.

---

## Goals

- [ ] Keep a catalogue of creditors, so every debt points at a counterparty that can be looked up.
- [ ] Register a debt with a schedule, and see the installments the API generated before leaving the screen.
- [ ] Register an open-ended debt with no term, whose balance moves only as payments are recorded.
- [ ] Record a payment against an installment, choosing debit, card or pix at that moment, and correct one already recorded.
- [ ] See the debt installments of a month with their expected amount, what was paid, their status and whether they are overdue.
- [ ] Open a creditor and see every debt owed to them and the total still outstanding.
- [ ] Show the month's debt obligation on the dashboard, so the balance on screen is money that is actually free.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Any change to backend business logic | The app consumes the API; the backend work is specified in its own repository |
| Computing a schedule, a balance, a settled state or an overdue flag on the client | MAD-001. All four are returned by the API; a second implementation would drift from it |
| Interest, amortisation tables or a "what would I pay if" calculator | The API does not model a rate; the app cannot invent one |
| Deleting a debt, a creditor or a payment | The API ships archiving and correction only |
| Renegotiating or rescheduling a debt | No endpoint exists |
| Receivables - money owed to the user | Out of scope in the backend spec too |
| Reminders or push notifications on a due date | Not requested; the month view shows the overdue flag the API returns |
| Charts of debt over time | Not requested |
| Offline write queue | Consistent with the rest of the app: reads are cached, mutations need connectivity |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Where debts live in navigation | A `debts` route group under `(app)`, sibling to `expenses` and `income` | A debt is neither an expense nor an income source, and burying it under expenses would imply it is one | n |
| Screen set | `Debts` (list), `DebtDetail` (schedule and payments), `RegisterDebt`, `RecordDebtPayment`, `Creditors`, `RegisterCreditor` | Mirrors the existing screen granularity: one screen per action, styles and tests beside it | n |
| Query keys | `debts(filters)`, `debt(id)`, `debtMonth(year, month)`, `debtMonths()`, `creditors()`, `creditorSummary(id)` added to `qk` | MAD-002: every key is built in `queryKeys.ts`, never inline | n |
| Invalidation after a payment | The debt, the debt list, the creditor summary, and the whole `debtMonth` and `dashboard` prefixes | MAD-003 scopes an invalidation to the month the API returned, but a payment changes the outstanding balance of every later month's line too. The prefix is the honest scope here, exactly as archiving a recurring bill already does | n |
| Invalidation after registering a debt | The same prefixes, since a new schedule can span months in either direction from the one on screen | Same reasoning | n |
| Creditor picker | A required picker on the register form, with a shortcut to create a creditor without losing the form | A debt cannot be registered without one, and forcing the user out to another screen and back would discard what they typed | n |
| Person preselection | Where the account has exactly one Person, it is preselected, as the existing forms do | Consistency with the expense and income forms | n |
| Mode selection | A two-option control on the register form; choosing `OpenEnded` hides the installment count and due day rather than disabling them | The API rejects those fields for an open-ended debt, so showing them would invite a request it will refuse | n |
| Total versus principal | Both fields shown, with the total defaulting to the principal as the user types it | Equal for a family loan and different for a bank loan; defaulting saves the common case a keystroke without hiding the distinction | n |
| Status labels | Pendente, Pago, Divergente - the same words the recurring lines already use | The user has learned these three; a fourth vocabulary for the same three states would be gratuitous | n |
| Overdue presentation | A distinct marker on the line, additional to the Pendente label, driven by the API's `IsOverdue` | Overdue is not a fourth status in the API and must not look like one in the app | n |
| Money and date input | Decimal string parsed before sending; dates sent as `YYYY-MM-DD` | Matches the conventions already in the app | y |
| Validation messages | The API's `errorMessages`, verbatim | MAD-004 | y |
| Settled debts in the list | Hidden by default with a toggle to include them, matching the API's default | A list that grows forever with paid-off debts buries the ones that still cost money | n |
| Dashboard presentation | A fourth block beside income, expenses and the balance, showing the month's debt total and its paid share | The API returns the debt half in the dashboard response; showing the balance net of it without showing the debts would be unexplainable | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Keep a catalogue of creditors ⭐ MVP

**User Story**: As an account owner, I want the people and institutions I owe to exist as records, so
that a debt names someone real and I can find everything I owe them later.

**Why P1**: No debt can be registered before its creditor exists.

**Acceptance Criteria**:
1. WHEN a user opens the creditors screen THEN the system SHALL list the creditors the API returns, showing each one's name and type.
2. WHEN a user creates a creditor THEN the system SHALL send its name, type and optional contact and notes.
3. WHEN a creditor is created THEN the system SHALL refresh the creditor list so it appears without a manual reload.
4. WHEN a user archives a creditor THEN the system SHALL remove it from the default list while leaving its debts reachable.
5. IF a request is rejected THEN the system SHALL show the API's messages and keep the form filled.

**Independent Test**: Create a creditor of type Pessoa, see it in the list, and find it offered in the
debt register form without reopening the app.

---

### P1: Register a debt ⭐ MVP

**User Story**: As an account owner, I want to record that I borrowed a sum - either over a fixed
number of months or with no term at all - so that the obligation exists in the app instead of in my
memory.

**Why P1**: The core action of the feature.

**Acceptance Criteria**:
1. WHEN a user registers a scheduled debt THEN the system SHALL send the name, creditor, person, category, mode, principal amount, total amount, start date, installment count and due day.
2. WHEN a user registers an open-ended debt THEN the system SHALL send neither an installment count nor a due day, and SHALL NOT present those fields.
3. WHEN a debt is registered THEN the system SHALL show how many installments the API created, the amount of each and the month the first one falls in.
4. WHEN a debt is registered THEN the system SHALL NOT compute its schedule, its installment amounts or its end month on the client.
5. WHEN a debt is registered THEN the system SHALL refresh the debt list, the month views and the dashboard.
6. WHEN a user has not entered a total amount THEN the system SHALL default it to the principal amount.
7. IF a request is rejected THEN the system SHALL show the API's messages and keep the form filled.

**Independent Test**: Register 1500,00 over 10 installments starting on the 20th with a due day of 10,
and be shown ten installments of 150,00 beginning in the following month.

---

### P1: Record a payment against a debt ⭐ MVP

**User Story**: As an account owner, I want to record that I paid an installment, saying then whether
it went out on debit, card or pix, so that what I owe reflects what I actually did.

**Why P1**: Without payments a debt never shrinks and the month view has nothing to compare against.

**Acceptance Criteria**:
1. WHEN a user records a payment against a scheduled installment THEN the system SHALL send the installment, the amount paid, the payment date and the optional type, account and notes.
2. WHEN a user records a payment against an open-ended debt THEN the system SHALL send the payment date and amount without an installment.
3. WHEN a payment already exists for the chosen installment THEN the system SHALL offer to correct the existing payment rather than sending a second one.
4. WHEN a payment type of Crédito is chosen THEN the system SHALL require an account before sending, and SHALL leave the account optional for Débito and Pix.
5. WHEN a payment is recorded or corrected THEN the system SHALL refresh the debt, the debt list, the creditor summary, the month views and the dashboard.
6. IF the API rejects the payment because the debt is archived or already paid THEN the system SHALL show that message rather than a generic failure.

**Independent Test**: Pay installment 1 of a ten-installment debt by pix with no account, see the
outstanding balance drop by that amount, and be routed to correction when opening the same
installment again.

---

### P1: See the debts of a month ⭐ MVP

**User Story**: As an account owner, I want to see which installments fall in this month and which of
them I have already paid, so that I know how much of the month is already spoken for.

**Why P1**: This is what makes a debt part of daily use rather than a record filed once.

**Acceptance Criteria**:
1. WHEN a user opens the debt month THEN the system SHALL show one line per installment the API returns, with the debt name, the creditor, the position as number out of count, the due date, the expected amount and the amount paid.
2. WHEN a line's status is returned THEN the system SHALL label it Pendente, Pago or Divergente.
3. WHEN a line is flagged overdue by the API THEN the system SHALL mark it distinctly, in addition to its Pendente label.
4. WHEN a month is opened THEN the system SHALL show the month's expected, paid and committed totals as the API returned them.
5. WHEN a month holds no debt lines THEN the system SHALL show an empty state rather than an error or a blank screen.
6. WHEN a user moves between months THEN the system SHALL fetch each month under its own cache entry.

**Independent Test**: With a ten-installment debt paid only in the first month, open month 1 as Pago
and month 2 as Pendente without either month affecting the other's cache.

---

### P1: See what is still owed, and to whom ⭐ MVP

**User Story**: As an account owner, I want to open my father and see every debt I have with him and
what is still outstanding, so that I can answer the question the way I actually think about it.

**Why P1**: Locating a debt by who is responsible for it is the reason the feature exists.

**Acceptance Criteria**:
1. WHEN a user opens a debt THEN the system SHALL show its creditor, person, category, principal, total, outstanding balance, whether it is settled, its full schedule and its recorded payments.
2. WHEN a debt is shown THEN the system SHALL render the outstanding balance and settled state the API returned, computing neither.
3. WHEN a user opens the debt list THEN the system SHALL allow filtering by creditor and by person.
4. WHEN a user opens the debt list THEN the system SHALL hide settled and archived debts by default and offer a control to include them.
5. WHEN a user opens a creditor's summary THEN the system SHALL show the count of unsettled debts, the total owed, the total paid and the outstanding balance.
6. WHEN a user archives a debt THEN the system SHALL remove it from the default list and from the month views.

**Independent Test**: With two debts against the same creditor, one settled, open that creditor and
see an outstanding balance covering only the unsettled one.

---

### P2: See the month's debts on the dashboard

**User Story**: As an account owner, I want the dashboard's balance to already subtract what I owe
this month, so that the number on screen is money I can actually spend.

**Why P2**: The debt month view is usable on its own; this makes the dashboard honest.

**Acceptance Criteria**:
1. WHEN a user opens the dashboard THEN the system SHALL show the month's debt total as its own block beside income and expenses.
2. WHEN the dashboard shows a balance THEN the system SHALL render the value the API returned, without subtracting debts on the client.
3. WHEN the debt block is tapped THEN the system SHALL open the debt month for the same month.
4. WHILE the dashboard is fetching for the first time the system SHALL show a loading indicator, and an error state with retry if it fails.

**Independent Test**: With income 5000, committed expenses 2000 and a debt installment of 150, read a
dashboard balance of 2850 with a debt block showing 150.

---

## Edge Cases

- WHEN a debt is registered whose first installment falls outside the month on screen THEN the system SHALL tell the user which month it starts in rather than silently leaving the list unchanged.
- IF an open-ended debt has two payments in one month THEN the system SHALL show both lines rather than collapsing them.
- WHEN a debt has no payments yet THEN the system SHALL show its outstanding balance as its full total rather than as zero.
- IF a payment is corrected downward and the API reports the debt as no longer settled THEN the system SHALL move it back into the default list.
- WHEN a creditor is archived while it still has unsettled debts THEN the system SHALL keep those debts listable and payable, and hide the creditor from the picker only.
- IF a debt's schedule runs longer than the list can show at once THEN the system SHALL keep the schedule scrollable rather than truncating it silently.
- WHEN the API is unreachable on any debt screen THEN the system SHALL say so rather than reporting a validation problem.
- WHILE a payment mutation is in flight the system SHALL disable its submit control so it cannot be sent twice.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| MCRD-01 | P1: Keep a catalogue of creditors | Types and client | Pending |
| MCRD-02 | P1: Keep a catalogue of creditors | Creditor screens | Pending |
| MDBT-01 | P1: Register a debt | Types and client | Pending |
| MDBT-02 | P1: Register a debt | Register screen | Pending |
| MDBT-03 | P1: Register a debt | Register screen | Pending |
| MPAY-01 | P1: Record a payment against a debt | Payment screen | Pending |
| MPAY-02 | P1: Record a payment against a debt | Payment screen | Pending |
| MPAY-03 | P1: Record a payment against a debt | Cache invalidation | Pending |
| MVEW-01 | P1: See the debts of a month | Month screen | Pending |
| MVEW-02 | P1: See the debts of a month | Month screen | Pending |
| MDTL-01 | P1: See what is still owed, and to whom | Detail screen | Pending |
| MDTL-02 | P1: See what is still owed, and to whom | List screen | Pending |
| MDTL-03 | P1: See what is still owed, and to whom | Creditor screens | Pending |
| MDSH-01 | P2: See the month's debts on the dashboard | Dashboard | Pending |

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped. Mapping happens in the Tasks phase.

### Requirement coverage map

| Requirement | Covers |
| ----------- | ------ |
| MCRD-01 | `Creditor` types, the creditor endpoints in the API client, the `creditors` query key |
| MCRD-02 | Creditor list and create screens, archiving, invalidation, error surfacing |
| MDBT-01 | `Debt`, `DebtInstallment` and `DebtPayment` types and their endpoints in the client |
| MDBT-02 | Register form: mode switch, creditor picker with inline create, person preselection, total defaulting to principal |
| MDBT-03 | Post-register feedback naming the generated installments and the first month; no client-side schedule maths |
| MPAY-01 | Payment form for a scheduled installment and for an open-ended debt |
| MPAY-02 | Correction path when a payment exists; account required for Crédito only |
| MPAY-03 | Invalidation of the debt, list, creditor summary, month prefix and dashboard prefix |
| MVEW-01 | Month lines with creditor, position, due date, expected and paid amounts |
| MVEW-02 | Status labels, the overdue marker, month totals, empty state, per-month cache entries |
| MDTL-01 | Detail screen rendering the API's balance and settled state, schedule and payments |
| MDTL-02 | List filtering by creditor and person, settled and archived hidden by default, archiving |
| MDTL-03 | Creditor summary screen |
| MDSH-01 | Dashboard debt block, balance rendered as returned, navigation into the debt month, loading and error states |

---

## Success Criteria

- [ ] `npx tsc --noEmit` reports no error and `npm test` is green, including every pre-existing test, none of which is edited.
- [ ] Registering 1500,00 over 10 installments shows ten installments of 150,00 without any schedule arithmetic in the app's source.
- [ ] Paying an installment by pix with no account succeeds; choosing Crédito with no account is blocked before the request, and the API's own rejection message is shown if it reaches the server.
- [ ] Opening a creditor shows an outstanding balance equal to the sum of its unsettled debts' remainders, taken from the API.
- [ ] After recording a payment, the debt detail, the debt list, the month view and the dashboard all reflect it without a manual reload.
- [ ] Searching the app's source for a computation of outstanding balance, settled state, schedule or overdue returns nothing (MAD-001).
