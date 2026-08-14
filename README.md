# Balance Mobile

React Native + Expo client for the Balance API — the mobile counterpart to `backend/`. See
`.specs/features/balance-mobile-app/{spec,design,tasks}.md` for the requirements, design and task
record this app was built against.

## Backend version required

This app depends on `paymentId` being present on `ResponseRecurringExpenseLineJson`, added by the
backend's own task T49. Without it, correcting a recurring bill's payment (spec REC AC4/AC5) is
unreachable from this app — a duplicate `POST` would fail with `PAYMENT_ALREADY_RECORDED` and there
would be no way to reach the correcting `PUT` instead. Run the backend from a commit on or after
`feat(expense-tracking): expose the payment id on the recurring line`.

The backend's CORS policy also needs the Expo web dev origin (`http://localhost:8081`), added
alongside the payment id fix — required only for `expo start --web`; a device or emulator is not a
browser and does not enforce CORS at all.

## Running

The system `node` is v12.6.0 and cannot run this toolchain. Node 20 lives under NVM but `nvm use`
needs administrator rights, which is not always available — so Node 20 is invoked by absolute path,
with its directory prepended to `PATH` for the duration of the shell session:

```powershell
$n = "$env:APPDATA\nvm\v20.19.4"
$env:PATH = "$n;$env:PATH"
node --version   # must print v20.19.4 before anything else in this shell
```

Prepending to `PATH` is required, not optional: `npm` spawns `jest`/`tsc`/`expo` as child processes
that resolve `node` from `PATH` on their own. Passing the Node 20 binary only to the npm invocation
still leaves those children finding the system v12, which fails with `SyntaxError: Unexpected token .`
from inside `node_modules` — an error that looks like a broken dependency and is not one.

With `PATH` set for the session:

```powershell
npm install         # first run only
npm test            # Jest + React Native Testing Library, the gate on every change
npx tsc --noEmit     # type check
npm run web          # expo start --web
```

If the test suite reports failures under the default worker count that do not reproduce when a file
is run alone, retry with `npm test -- --maxWorkers=2`. This machine has shown real CPU contention
under Jest's default parallelism; T41 traced one such case to a `waitFor` timeout that was tight for a
`mutate → invalidate → refetch` chain rather than to a product bug, and widened it rather than
disabling the test. A failure that reproduces with `--maxWorkers=2` is a real one.

### Backend

Start the API from `backend/` (`dotnet run --project src/Balance.Api`) and PostgreSQL via
`docker compose up -d` there. The database is seeded by `frontend/scripts/seed.mjs`
(`node frontend/scripts/seed.mjs` from the repo root, also on the Node 20 binary above) — see that
script for the seeded account's credentials.

### Configuration

`EXPO_PUBLIC_API_URL` sets the API base; it defaults to `http://localhost:5126/api`, which works for
the web build and for an emulator on the same machine. **A physical device cannot resolve
`localhost`** — that name means the phone itself, not the machine running the API — so testing on a
real device needs `EXPO_PUBLIC_API_URL` set to the machine's LAN IP, e.g.
`http://192.168.1.23:5126/api`. Find that address with `ipconfig` (Windows) and confirm the phone is
on the same network; only you know it, so nothing in the app guesses it.

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.23:5126/api"
npm run web   # or: npx expo start, then scan the QR code with Expo Go
```

## Known limits

- **No emulator was available while building this app.** Every gate is Jest + React Native Testing
  Library plus `expo start --web`; nothing here has verified how the app renders on iOS or Android.
  Run it in Expo Go before trusting the visual layout on a device.
- **Correcting a payment recorded before the app's most recent restart depends entirely on the
  backend's `paymentId` field** (see above). If that field is ever removed or renamed, the correction
  screen has no other way to find the payment to correct.
