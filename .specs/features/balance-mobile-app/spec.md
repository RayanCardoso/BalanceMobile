# Balance Mobile App Specification

## Problem Statement

The Balance API can record every income source, every expense, every recurring bill and reconcile a
whole month — and the only way to reach it is Swagger or a demo web page pinned to one seeded account.
Nobody records a grocery run from a laptop. The data this API is designed to hold is entered on a
phone, standing in a queue, seconds after the money leaves.

The app has to carry the model's real shape, not a simplified copy of it. A recurring bill is an
estimate until it arrives and a fact afterwards. A credit purchase after the closing day belongs to
next month's invoice. An installment purchase is one decision producing ten charges. Flatten any of
that into "a list of transactions" and the app stops matching the system behind it.

---

## Goals

- [ ] Sign in once and stay signed in across app restarts, with the token held in the device's secure storage.
- [ ] Show one month at a glance: income received, expenses committed, and the balance between them.
- [ ] Record income — recurring sources with an expected amount, variable ones without — and the payments received against them.
- [ ] Record expenses on credit, debit and pix, and installment purchases that produce one charge per month.
- [ ] Manage recurring bills: register, re-price with a reason, archive, and record what each month actually cost.
- [ ] Keep the catalogue the rest depends on: people, categories and accounts.
- [ ] Surface the API's own validation messages rather than inventing client-side copies of its rules.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Any change to backend business logic | The app consumes the API; the only backend change is adding the Expo web origin to the existing CORS policy |
| Re-deriving the competence month on the client | The server owns that rule; a second implementation would drift from it |
| Offline write queue | Reads are cached by TanStack Query; mutations require connectivity |
| Editing or deleting a one-off expense, cancelling an installment plan | The backend ships no endpoint for either |
| Archive / unarchive for an income source | The backend still has no operation that sets it |
| Push notifications, biometric unlock, deep links | Not requested |
| Charts, reports, exports | Not requested |
| Multi-currency | The API assumes a single implicit currency |
| Release build, signing, store submission | Development build only |
| Visual verification on a physical device or emulator by the agent | No emulator is available in this session; `expo start --web` is the only rendering surface the agent can reach, and the user runs Expo Go themselves |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Architecture | Feature-first with thin `api` / `model` / `ui` layers per domain | The user chose it; the app has no business rules of its own to justify Clean Architecture's layers | y |
| Language | TypeScript, strict mode | The user asked for it mid-session; also the Expo template default | y |
| Server state | TanStack Query | The user chose it; cache invalidation after a mutation is the app's main state problem and Query solves it directly | y |
| Client state | Zustand, session and preferences only | The user chose it; anything server-derived belongs to Query, not a store | y |
| Styling | React Native `StyleSheet`, no styling library | The user chose it over NativeWind; keeps the dependency surface minimal | y |
| Versioning | A git repository inside `mobile/`, separate from `backend/` | The user chose it; the two evolve independently | y |
| Verification | Jest + React Native Testing Library as the gate, `expo start --web` to look | The user chose it, accepting that no device rendering is verified by the agent | y |
| Expo SDK | The current release at scaffold time (SDK 56 line, React Native 0.85, React 19.2) | SDK 55 dropped the Legacy Architecture, so a new project is on the New Architecture regardless | n |
| Navigation | Expo Router, file-based, with a route group guarded by session state | The Expo default since SDK 49 and what the folder structure assumes | n |
| Token storage | `expo-secure-store` on device; `localStorage` fallback on web, where SecureStore has no implementation | SecureStore is a native module; the web build would throw without a fallback | n |
| Token expiry | On any 401 from a non-auth route, the session is cleared and the user returns to sign-in | The API issues a 60-minute token and has no refresh endpoint; a silent failure would look like data loss | n |
| API base URL | From `EXPO_PUBLIC_API_URL`, defaulting to `http://localhost:5126/api` | Expo's documented public-env convention; a device needs the machine's LAN IP, which only the user knows | n |
| CORS | The Expo web dev origin is added to the backend's existing named policy | Only the browser build needs it; React Native on a device does not enforce CORS | n |
| Money input | Entered as a decimal string, parsed to a number before the request | Matches the API's `numeric(18,2)` and avoids float drift in the field itself | n |
| Date input | Entered and sent as `YYYY-MM-DD`, matching the API's `DateOnly` | Avoids timezone shifting a date by a day, which a `Date` object would risk | n |
| Validation messages | Rendered from the API's `errorMessages` array; the client validates only emptiness and number format | The API already localises them, and duplicating its rules would let the two disagree | n |
| Person selection | Where a request needs a `personId` and the account has exactly one Person, it is preselected | The single-person case is the common one and a mandatory picker with one option is noise | n |
| Language | Portuguese UI copy, `Accept-Language: pt-BR` sent on every request | The user works in Portuguese and the API ships pt-BR messages | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Sign in and stay signed in ⭐ MVP

**User Story**: As a Balance user, I want to sign in once on my phone and still be signed in tomorrow, so that recording an expense takes seconds rather than a login.

**Why P1**: Every other screen is behind `[Authorize]`.

**Acceptance Criteria**:
1. WHEN a user submits valid credentials THEN the system SHALL store the returned token in the device's secure storage and show the month dashboard.
2. WHEN a user submits registration details THEN the system SHALL create the account, store the returned token and show the month dashboard.
3. WHEN the app starts and a stored token exists THEN the system SHALL go straight to the dashboard without asking for credentials.
4. WHEN the app starts and no stored token exists THEN the system SHALL show the sign-in screen.
5. IF the API answers 401 to any authorised request THEN the system SHALL clear the stored token and return to the sign-in screen.
6. WHEN a user signs out THEN the system SHALL clear the stored token and any cached server data, and return to the sign-in screen.
7. IF sign-in fails THEN the system SHALL show the message the API returned and leave the entered email in place.
8. The system SHALL attach the stored token as a bearer header to every request to an authorised route.

**Independent Test**: Sign in, force-quit, reopen and land on the dashboard; sign out and reopen to land on sign-in.

---

### P1: See the month at a glance ⭐ MVP

**User Story**: As an account owner, I want one screen showing what came in, what the month costs and what is left, so that I know where I stand without adding anything up.

**Why P1**: It is the reason the dashboard endpoint exists and the app's landing screen.

**Acceptance Criteria**:
1. WHEN the dashboard opens THEN the system SHALL request the current month and show the income received, the committed expense and the balance.
2. WHEN a user moves to the previous or next month THEN the system SHALL load and show that month.
3. WHILE a month's data is loading the system SHALL show a loading state rather than stale figures from another month.
4. WHEN a month has no records THEN the system SHALL show zeroed totals and an empty state rather than a blank screen.
5. IF the balance is negative THEN the system SHALL present it as negative rather than as an absolute value.
6. The system SHALL show recurring income, variable income, recurring expenses and variable expenses as four distinguishable groups.
7. IF the dashboard request fails THEN the system SHALL show an error state with a retry action.

**Independent Test**: Open the seeded August, read a positive balance, move to September and read a negative one.

---

### P1: Keep the catalogue ⭐ MVP

**User Story**: As an account owner, I want my people, categories and payment accounts on the phone, so that recording anything can reference them.

**Why P1**: No income source, expense or bill can be created without them.

**Acceptance Criteria**:
1. WHEN a user opens the catalogue THEN the system SHALL list that account's people, categories and accounts.
2. WHEN a user creates a person, a category or an account THEN the system SHALL persist it through the API and show it in the list without a manual refresh.
3. WHEN a category is shown THEN the system SHALL label its priority as Essencial, Importante or Supérfluo.
4. WHEN an account is created THEN the system SHALL accept an empty closing day, due day and limit.
5. IF a create request fails validation THEN the system SHALL show the API's messages and keep the form filled.
6. WHERE a form needs a person and the account has exactly one, the system SHALL preselect that person.

**Independent Test**: Create a category and see it appear in the picker of the expense form without restarting.

---

### P1: Record and review income ⭐ MVP

**User Story**: As an account owner, I want to register where my money comes from and record what actually arrived, so that the month reflects reality.

**Why P1**: Half of the model the backend ships.

**Acceptance Criteria**:
1. WHEN a user opens the income month THEN the system SHALL show one line per source with its expected amount, received amount and status.
2. WHEN an income source's status is returned THEN the system SHALL label it Pendente, Recebido or Divergente.
3. WHEN a user registers a recurring income source THEN the system SHALL send its amount and expected day and show it in the month.
4. WHEN a user registers a variable income source THEN the system SHALL send neither an amount nor an expected day.
5. WHEN a user records an income payment THEN the system SHALL send the reference month separately from the payment date.
6. WHEN a payment is recorded THEN the system SHALL refresh the month so the new received amount and status appear without a manual reload.
7. WHEN a user changes a recurring source's value THEN the system SHALL send the new amount, the new expected day, the validity start and the change reason.
8. IF a request is rejected THEN the system SHALL show the API's messages without translating them into its own wording.
9. The system SHALL allow more than one payment against the same source in the same reference month.

**Independent Test**: Record a payment dated 3 September for reference month August and see August's total change while September's does not.

---

### P1: Record and review expenses ⭐ MVP

**User Story**: As an account owner, I want to record a purchase on credit, debit or pix the moment it happens, so that nothing is reconstructed from memory later.

**Why P1**: The other half of the model, and the most frequent action in the app.

**Acceptance Criteria**:
1. WHEN a user opens the expense month THEN the system SHALL show the month's variable expenses and its recurring bills as separate groups.
2. WHEN a user registers an expense THEN the system SHALL send the name, person, type, amount, category, account and date.
3. WHEN a user registers an expense without overriding the competence month THEN the system SHALL let the API derive it rather than computing it on the client.
4. WHERE a user chooses to override the competence month, the system SHALL send the chosen month.
5. WHEN an expense is registered THEN the system SHALL refresh the affected month so the new line appears without a manual reload.
6. WHEN a registered expense's competence month differs from the month being viewed THEN the system SHALL tell the user which month it landed in.
7. The system SHALL allow an expense to reference an account belonging to a different person of the same account holder.
8. IF a request is rejected THEN the system SHALL show the API's messages and keep the form filled.

**Independent Test**: With an account closing on day 20, record a credit expense dated the 21st and be told it landed in the following month.

---

### P1: Manage recurring bills ⭐ MVP

**User Story**: As an account owner, I want my monthly bills to exist once, with their real value entered when each one arrives, so that the month's cost is an estimate that becomes a fact.

**Why P1**: The behaviour that distinguishes this app from a transaction list.

**Acceptance Criteria**:
1. WHEN a user registers a recurring bill THEN the system SHALL send its base amount, due day and whether the amount is an estimate.
2. WHEN a recurring line's amount is an estimate and no payment exists for that month THEN the system SHALL mark the figure as provisional.
3. WHEN a user records what a bill cost in a month THEN the system SHALL send the reference month, payment date, amount paid and optionally the paying account.
4. WHEN a payment already exists for that bill and month THEN the system SHALL offer to correct the existing payment rather than sending a second one.
5. WHEN a recorded payment is corrected THEN the system SHALL send only the amount, payment date, notes and paying account.
6. WHEN a user changes a bill's base value THEN the system SHALL send the new amount, the validity start and the change reason.
7. WHEN a user archives a bill THEN the system SHALL remove it from the month view while leaving its recorded payments untouched.
8. WHEN a user unarchives a bill THEN the system SHALL show it in the month view again.
9. WHEN a recurring line's status is returned THEN the system SHALL label it Pendente, Pago or Divergente.
10. IF the API rejects a payment because the bill is archived THEN the system SHALL show that message rather than a generic failure.

**Independent Test**: Register a bill estimated at 150, see it marked provisional, record 187.40 and see the line switch to Divergente with the real value.

---

### P2: Record an installment purchase

**User Story**: As an account owner, I want to record a purchase split into installments once, so that the monthly charges appear on their own without me entering ten of them.

**Why P2**: Valuable and explicitly part of the backend model, but the account is usable without it.

**Acceptance Criteria**:
1. WHEN a user registers an installment plan THEN the system SHALL send the total amount, the installment count and the start date.
2. WHEN a plan is registered THEN the system SHALL show how many installments were created and the amount of each.
3. WHEN an installment appears in a month THEN the system SHALL show its position as its number out of the plan's total.
4. IF the installment count is rejected THEN the system SHALL show the API's message.

**Independent Test**: Register 100,00 in 3 installments and see 33,33 / 33,33 / 33,34 across three consecutive months.

---

### P2: Understand what the app is doing

**User Story**: As a user, I want to know whether the app is loading, failed or has nothing to show, so that I never stare at an ambiguous blank screen.

**Why P2**: Cross-cutting polish, but the difference between a usable app and a confusing one.

**Acceptance Criteria**:
1. WHILE any screen is fetching for the first time the system SHALL show a loading indicator.
2. IF a request fails for a reason other than validation THEN the system SHALL show an error state with a retry action.
3. WHEN a list has no items THEN the system SHALL show an empty state explaining what would appear there.
4. WHILE a mutation is in flight the system SHALL disable its submit control so the request cannot be sent twice.
5. IF the API is unreachable THEN the system SHALL say so rather than reporting a validation problem.

**Independent Test**: Stop the API, open the dashboard, see an unreachable-API message and a retry that works once the API is back.

---

## Edge Cases

- IF a stored token has expired THEN the system SHALL clear the session on the first 401 and return to sign-in without showing a broken screen.
- IF a month is opened before any record exists THEN the system SHALL show zeroed totals rather than an error.
- WHEN a recurring bill has no version in effect for a month THEN the system SHALL show its expected amount as absent rather than as zero.
- IF a due day is 31 and the month is shorter THEN the system SHALL show the day as the API returned it, without clamping.
- WHEN an expense is registered into a month other than the one on screen THEN the system SHALL not silently leave the list unchanged.
- IF two categories carry the same name THEN the system SHALL show both as separate options.
- WHEN the device is offline and a mutation is attempted THEN the system SHALL report the failure rather than appearing to succeed.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTH-01 | P1: Sign in and stay signed in | 1 | Implementing |
| AUTH-02 | P1: Sign in and stay signed in | 2 | Implementing |
| AUTH-03 | P1: Sign in and stay signed in | 2 | Implementing |
| CAT-01 | P1: Keep the catalogue | 1 | Implementing |
| CAT-02 | P1: Keep the catalogue | 3 | Implementing |
| DASH-01 | P1: See the month at a glance | 0 | Implementing |
| DASH-02 | P1: See the month at a glance | 3 | Implementing |
| INC-01 | P1: Record and review income | 3 | Implementing |
| INC-02 | P1: Record and review income | 6 | Implementing |
| INC-03 | P1: Record and review income | 2 | Implementing |
| EXP-01 | P1: Record and review expenses | 7 | Implementing |
| EXP-02 | P1: Record and review expenses | 7 | Implementing |
| EXP-03 | P1: Record and review expenses | 7 | Implementing |
| REC-01 | P1: Manage recurring bills | 8 | Implementing |
| REC-02 | P1: Manage recurring bills | 8 | Implementing |
| REC-03 | P1: Manage recurring bills | 0 | Implementing |
| REC-04 | P1: Manage recurring bills | 8 | Implementing |
| INST-01 | P2: Record an installment purchase | 7 | Implementing |
| UX-01 | P2: Understand what the app is doing | 1 | Implementing |
| UX-02 | P2: Understand what the app is doing | 2 | Implementing |

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 20 total, 0 mapped to tasks, 20 unmapped. Mapping happens in the Tasks phase.

### Requirement coverage map

| Requirement | Covers |
| ----------- | ------ |
| AUTH-01 | Sign-in and registration storing the token in secure storage |
| AUTH-02 | Session restored on start; route guard between signed-in and signed-out |
| AUTH-03 | Bearer header on every authorised call; 401 clears the session; sign-out clears the cache |
| CAT-01 | Listing people, categories and accounts; priority labels; nullable account fields |
| CAT-02 | Creating each of the three, cache invalidation, API error surfacing, person preselection |
| DASH-01 | Month totals and balance, four groups, month navigation |
| DASH-02 | Loading, empty and error states of the dashboard, negative balance |
| INC-01 | Monthly income lines with expected, received and status labels |
| INC-02 | Registering recurring and variable sources |
| INC-03 | Recording payments with a decoupled reference month, changing a source's value, refresh after mutation |
| EXP-01 | Monthly expense view, variable and recurring groups |
| EXP-02 | Registering an expense; the competence month is the server's, with an optional override |
| EXP-03 | Refresh after mutation, cross-month feedback, cross-person accounts, error surfacing |
| REC-01 | Registering a recurring bill with its estimate flag and due day |
| REC-02 | Provisional marking, status labels |
| REC-03 | Recording a month's real cost; routing a duplicate to the correction path |
| REC-04 | Changing the base value; archive and unarchive |
| INST-01 | Registering a plan and showing the generated installments and their positions |
| UX-01 | Loading, empty and error states across screens |
| UX-02 | Double-submit prevention and unreachable-API messaging |

---

## Success Criteria

- [ ] `npx tsc --noEmit` reports no error and `npm test` is green.
- [ ] A signed-in user can register a person, a category and an account, then an income source, an expense and a recurring bill, without leaving the app.
- [ ] Recording a payment updates the month on screen without a manual reload.
- [ ] A credit expense dated after its account's closing day tells the user which month it landed in.
- [ ] A recurring bill shows a provisional estimate before payment and the real value after.
- [ ] Force-quitting and reopening the app lands on the dashboard, still signed in.
- [ ] Signing out and reopening lands on sign-in with no cached data from the previous account.
- [ ] `expo start --web` renders the dashboard against the seeded database.
