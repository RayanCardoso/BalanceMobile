# Balance Mobile App Context

**Gathered:** 2026-08-13
**Spec:** `.specs/features/balance-mobile-app/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A React Native + Expo client for the Balance API, covering every income and expense capability the
backend already ships. The app consumes the API; it adds no business rule of its own and no local
database.

**The backend is not modified**, with one exception the user is asked to approve: adding the Expo web
dev origin to the existing CORS policy. That is required only for browser rendering — React Native on
a device or emulator is not a browser and does not enforce CORS at all.

---

## User Decisions

### Architecture — feature-first with thin layers

```
app/                       Expo Router routes (file-based)
src/features/<domain>/
  api/                     endpoint calls + query/mutation hooks
  model/                   types, mappers, domain-adjacent helpers
  ui/                      screens and components of that domain
src/shared/{api,ui,lib}/   only what two or more features genuinely share
```

Chosen over mirroring the backend's Clean Architecture. The reasoning, recorded so it is not
relitigated: the backend earns its layers because real rules live there — competence month, version
timelines, installment residue. None of that repeats in the app, which reads and posts. Replicating
`domain/data/presentation` here would produce use-case classes that only forward calls.

Type-first (the plain Expo template) was rejected for the opposite reason: at ~16 screens, touching one
domain would mean hunting through five top-level folders.

### Stack

| Concern | Choice |
| ------- | ------ |
| Language | **TypeScript**, strict |
| Server state | **TanStack Query** — cache, refetch, mutations, invalidation |
| Client state | **Zustand** — session and preferences only |
| Styling | **StyleSheet** (React Native built-in), no styling dependency |
| Navigation | **Expo Router**, file-based |
| Secrets | **expo-secure-store** for the JWT |
| Tests | **Jest + React Native Testing Library** |

Redux Toolkit was offered and declined. The 2026 split — TanStack Query for server state, Zustand for
the little that is genuinely client state — is what the app actually needs; a single store would mean
hand-rolling cache invalidation that Query already does.

### Versioning

`git init` inside `mobile/`, its own repository and history, independent of `backend/`. The `frontend/`
folder stays unversioned for now — the user was offered versioning it too and chose not to.

### Verification

Jest + React Native Testing Library are the gate on every task. For looking at the result,
`expo start --web` renders in a browser. No Android or iOS emulator is available in this session, so
**the app is never visually verified on a real device by the agent** — the user runs Expo Go when they
want that. This is a real limit on what the gates prove and is repeated in the spec's Out of Scope.

---

## The API this app consumes

Read from the backend source, not assumed. Every route is `[Authorize]` except register and login.

| Route | Purpose |
| ----- | ------- |
| `POST /api/user` | Register; returns `{ name, token }` |
| `POST /api/login` | Login; returns `{ name, token }` |
| `POST` / `GET /api/person` | Create and list People |
| `POST` / `GET /api/category` | Create and list Categories (`priority`: 0 Essential, 1 Important, 2 Superfluous) |
| `POST` / `GET /api/account` | Create and list Accounts (`closingDay`, `dueDay`, `limit` all nullable) |
| `POST /api/income` | Register an income source (`type`: 0 Recurring, 1 Variable) |
| `POST /api/income/payment` | Record income received |
| `PUT /api/income/value` | Change a recurring source's value |
| `GET /api/income/{year}/{month}` | Monthly income view |
| `POST /api/expense` | Register a one-off expense (`type`: 0 Credit, 1 Debit, 2 Pix) |
| `POST /api/expense/installment-plan` | Register a plan; returns the generated installments |
| `GET /api/expense/{year}/{month}` | Monthly expense view |
| `POST /api/recurring-expense` | Register a recurring bill |
| `PUT /api/recurring-expense/value` | Change its base value |
| `PUT /api/recurring-expense/{id}/archive?archived=` | Archive / unarchive |
| `POST /api/recurring-expense/payment` | Record what a bill actually cost |
| `PUT /api/recurring-expense/payment/{id}` | Correct a recorded payment |
| `GET /api/dashboard/{year}/{month}` | Income + expenses + balance for one month |

**Error shape:** 400 returns `{ errorMessages: string[] }`, already localised by the API's
`Accept-Language` middleware. 404 means "not found or not yours" — the backend deliberately does not
distinguish (backend decision AD-004), so the app must never phrase a 404 as a permission error.

**Dates** cross the wire as `YYYY-MM-DD` (`DateOnly`). **Money** is a JSON number with 2 decimals.

---

## Backend behaviour the UI has to respect

These are the backend's rules. The app displays them; it must not re-derive or contradict them.

- **Competence month is the server's call.** A credit purchase after the account's closing day belongs
  to the next month. The app sends `date` and lets the API decide, or sends an explicit
  `competenceMonth` to override. It must not compute the roll itself — two implementations of one rule
  is exactly the drift the backend's design avoided.
- **A recurring bill's expected amount is an estimate until paid.** `isEstimate` marks a provisional
  figure; the monthly line's `actualAmount` overrides it for that month only.
- **One payment per recurring bill per month.** A second POST answers 400 `PAYMENT_ALREADY_RECORDED`;
  correcting means `PUT`ting the existing payment. The UI has to route the user to the right verb.
- **Income allows several payments per month and sums them**; recurring expenses do not. The two
  monthly screens therefore differ in shape, and that difference is intentional.
- **Status enums differ:** income is `Pending | Received | Divergent`, expense is
  `Pending | Paid | Divergent`. Same integers, different words.
- **Archived recurring expenses vanish from the monthly view but keep their payments.**

---

## Lessons carried from the backend

Ten lessons exist in `backend/.specs/LESSONS.md`, all still candidates (each seen in one feature), so
none is loaded as confirmed guidance. Four are about test discipline and are worth applying here
deliberately rather than rediscovering:

- **L-003** — assert one field per clause of a conjunctive criterion.
- **L-004** — assert every pass-through field a projection copies; totals do not cover them. This is
  what let a wrong `dueDay` ship in the backend.
- **L-005** — give every branch of a status rule its own fixture, including the null branch.
- **L-010** — never compute a test's expected value with the implementation's own call; that mirrors
  the code instead of pinning it.

---

## Deferred Ideas

- Offline write queue. TanStack Query caches reads; mutations require connectivity.
- Push notifications for a bill's due day.
- Biometric unlock.
- Editing or deleting a one-off expense, and cancelling an installment plan — the backend has no
  endpoint for either.
- Archive/unarchive for an income source — the backend still has no operation for it.
- Charts and reports.
- Multi-currency.
- A release build, app signing, or store submission.
