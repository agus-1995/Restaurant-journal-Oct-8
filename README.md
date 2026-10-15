# Mi Diario

A mobile-first food journal for people who love restaurants, wineries and street food. Log a meal in
under 30 seconds (place, photo, how it was), browse it later like a scrapbook, and share a single entry
as an image.

All data goes through a repository layer. With **no configuration** it runs on local mock data
(`localStorage`), so it always works out of the box. With **Supabase keys** in `.env.local` it uses
Postgres and Storage instead, with no changes to any screen (see [Supabase](#supabase)).

## Run it

Requires Node 20.19+ (or 22.12+).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script           | What it does                                      |
| ---------------- | ------------------------------------------------- |
| `npm run dev`    | Dev server with hot reload                        |
| `npm run build`  | Type-check (strict) and production build          |
| `npm run lint`   | ESLint (incl. accessibility + architecture rules) |
| `npm test`       | Vitest + React Testing Library                    |
| `npm run format` | Prettier                                          |

To try it on a phone on the same Wi-Fi: `npm run dev -- --host`, then open the printed network URL.

The first run seeds 14 realistic entries (Buenos Aires and Mendoza: bodegones, wineries, street food,
"unusual" finds) and 3 wishlist items. Place names are fictional and photos are generated placeholders.

### Dev switches (set in the browser console, then reload)

```js
localStorage.setItem('mi-diario:fail', '1') // every request fails: see error states
localStorage.removeItem('mi-diario:fail') // back to normal
localStorage.clear() // wipe everything and re-seed demo data
localStorage.setItem('mi-diario:seed', 'empty') // (after clear) start with an empty journal: see onboarding
```

## What's in it

| Route             | Screen                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `/`               | Journal: photo-first feed, newest first, grouped by month, "+ Log" button                                  |
| `/log`            | Quick log: 3 steps, draft saved automatically, smart defaults                                              |
| `/entry/:id`      | Entry detail: photos, dishes, price, reaction, notes, edit, delete, share                                  |
| `/entry/:id/edit` | Edit an entry (place is fixed)                                                                             |
| `/search`         | Text search + filters (price, reaction, occasion, cuisine, neighborhood, unusual). Filters live in the URL |
| `/wishlist`       | "Want to try": add, remove, and "I went" converts an item into a log                                       |

Also: a share card (PNG drawn on a canvas, shared with the Web Share API when available, otherwise
download image / copy link), a first-log celebration, empty/loading/error states on every screen,
Spanish (Argentina, default) and English UI, bottom tab bar on phones and side nav from tablet up.

### Logging speed

- Today's date, the last-used occasion and the last-used city are pre-filled.
- Recently visited places are one-tap chips; typing finds existing places (accent-insensitive) or
  creates a new one inline.
- The shortest path is: pick place → Next → pick reaction → **Save now** (about 4 taps).
- Leaving the screen keeps your progress (draft in `localStorage`); "Start over" discards it.

## Architecture

The rule that makes the Supabase swap easy: **screens never touch data directly.**

```
Pages / components  ──►  hooks (src/hooks)  ──►  repository interfaces  ──►  implementation
  (src/features,         TanStack Query         (src/data/repositories)      mock (localStorage)
   src/components)       useEntries, …                                       later: Supabase
```

- `src/types`: domain types (`Place`, `Entry`, `WishlistItem`, `UserPreferences`) and create/update inputs.
- `src/data/repositories`: **interfaces only** (`EntryRepository`, `PlaceRepository`,
  `WishlistRepository`, `PreferencesRepository`, `ImageStorage`) plus `RepositoryError`.
- `src/data/mock`: the localStorage implementations, seed data, 200-500 ms simulated latency, failure
  injection.
- `src/data/createRepositories.ts`: **the one place that chooses mock vs Supabase.**
- `src/data/RepositoryProvider.tsx`: puts the chosen repositories in React context.
- `src/hooks`: one hook per use case. These are the only thing UI code calls.
- An ESLint rule (`no-restricted-imports`) fails the build if UI code imports from `src/data/mock`.

```
src/
  app/          router, providers, layout shell (tab bar, side nav), 404 / error pages
  components/   shared UI (Button, Modal, ChoiceGroup, TagInput, PhotoField, states…)
  data/         repositories (interfaces), mock (implementation), provider
  features/     journal, entry, log, search, wishlist, share, entryForm (shared form pieces)
  hooks/        data hooks (TanStack Query)
  i18n/         es-AR.json, en.json (keys are type-checked)
  lib/          pure helpers: filters, formatting, dates, ids, image compression
  test/         test utilities
  types/        domain types
```

### Data model

Changes from the original draft:

- `Entry.dishes` is `{ name, note? }[]` rather than strings, so a dish can carry a note.
- `Entry` has `createdAt` / `updatedAt`; `WishlistItem` has an optional `source` ("Cami", "Instagram").
- `Place.neighborhood` is optional (a place can be created on the fly with just a name and city), and
  places have an optional `address` / `mapsUrl` (unused by the UI so far).
- `UserPreferences` (`lastOccasion`, `lastCity`, `onboardingSeen`) behind its own repository, so the
  smart defaults move to the back end with everything else.
- `Entry.photos` holds whatever `ImageStorage.upload` returned (a compressed data URL today).

Only `placeId`, `date` and `reaction` are required on an `Entry`.

### Error handling

Repositories throw one error type, `RepositoryError`, with a `code`:
`not_found | conflict | invalid | quota_exceeded | unavailable`. Screens translate the code into a
friendly message and offer a retry, so a Supabase implementation only has to throw the same codes.

## Internationalisation

`react-i18next`, Spanish (Argentina) by default, English second; the choice is remembered. There are no
hardcoded strings in components. Translation keys are typed from `es-AR.json`, and `en.json` is checked
against it, so a missing translation fails `npm run build`.

## Accessibility

Semantic HTML, a skip link, visible focus rings, 44px+ tap targets, labels on every input, alt text,
focus-trapped modals that restore focus, and `prefers-reduced-motion` support. Colour contrast meets WCAG
AA (measured values are in `src/index.css`). Checked with axe-core in tests and in a real browser.

## Tests

`npm test` runs ~250 tests: the repository layer (CRUD, integrity rules, latency, failure injection,
quota, corrupt storage), quick-log form validation, search/filter logic, every screen end to end
(React Testing Library), hooks, and an axe-core accessibility audit. Canvas drawing for the share card
needs a real browser, so it is verified manually rather than in jsdom.

## Supabase

The app picks its data source in one place, `src/data/createRepositories.ts`: if `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` are set it uses Supabase, otherwise the local mock. The browser console logs
which one is active (`[Mi Diario] Data source: …`).

### One-time setup

1. **Create the tables.** In the Supabase dashboard open **SQL Editor → New query**, paste the contents of
   [`supabase/migrations/20261008000000_init.sql`](supabase/migrations/20261008000000_init.sql) and run it.
   It creates `places`, `entries`, `wishlist_items`, `user_preferences`, row-level-security policies, an
   `updated_at` trigger and the `entry-photos` Storage bucket. It is safe to run twice.
2. **Add the keys.** Copy `.env.example` to `.env.local` and fill in your project URL and the **anon /
   publishable** key (**Project Settings → API**). Restart `npm run dev`.
3. **Email settings** (**Authentication → URL Configuration**). Set **Site URL** to where the app runs
   (`http://localhost:5173` while developing, your real domain in production) and add the same address,
   with `/**` at the end, under **Redirect URLs**. Without this, the links in confirmation and
   password-reset emails point to the wrong place.
4. **Decide on email confirmation** (**Authentication → Sign In / Providers → Email → "Confirm email"**).
   Either way works: with it **off** people get in right after signing up; with it **on** the app tells
   them to check their inbox. Supabase's built-in email service is heavily rate-limited, so for real
   traffic configure your own SMTP provider.

> Never put the `service_role` / secret key in the front end. It bypasses all security. The app refuses to
> start if it detects one.

### Accounts

With Supabase the app has real email + password accounts: **sign up, sign in, sign out, forgot password
and reset password** (`/signup`, `/login`, `/forgot-password`, `/reset-password`). Every private screen is
behind a sign-in check and returns you to the page you were opening. The account button (person icon)
shows who you are and signs you out. Cached data is cleared whenever the signed-in user changes, so
nobody can briefly see someone else's journal. With local mock data there are no accounts and none of
these screens appear.

### How it works

- `src/data/supabase/` implements every interface from `src/data/repositories` (entries, places,
  wishlist, preferences, photo storage, and the auth service). Screens and hooks are untouched.
- **Security:** every row has a `user_id` and row-level security only lets a user read or change their own
  rows. Entries and wishlist items can only point at the user's own places. Storage files live in a folder
  named after the user, and only the owner can see, change or delete them.
- **Errors:** Postgres/Storage/Auth errors are translated into the same `RepositoryError` codes the mock
  uses (`not_found`, `conflict`, `invalid`, `quota_exceeded`, `unavailable`, `unauthorized`, plus
  `invalid_credentials`, `email_not_confirmed`, `email_taken`, `weak_password`, `rate_limited` for
  accounts), so the existing messages and retry buttons keep working.
- **Photos:** compressed to JPEG in the browser and uploaded to `entry-photos/<user id>/<uuid>.jpg`. The
  entry stores the public URL. Photos are deleted from Storage when an entry is deleted or the photo is
  removed in an edit. The bucket is public (unguessable URLs) so `<img>` and the share card can load them.
- **Seed data** exists only in the mock: a new account starts with an empty journal and sees the
  onboarding state.

### Testing against your real project

`npm test` runs a shared **repository contract** against the mock. The same contract (plus photo-cleanup and
cross-user isolation checks) runs against live Supabase when you provide a **dedicated test account**:

```bash
SUPABASE_TEST_URL=https://<ref>.supabase.co \
SUPABASE_TEST_ANON_KEY=<anon key> \
SUPABASE_TEST_EMAIL=<test account email> \
SUPABASE_TEST_PASSWORD=<test account password> \
SUPABASE_TEST_ALLOW_WIPE=yes \
npm run test:supabase
```

> **The tests delete all of that account's data.** Create a throwaway account just for this (sign up in the
> app) and never use one you care about. The extra `SUPABASE_TEST_ALLOW_WIPE=yes` is a deliberate safety
> switch. One test also signs up a throwaway `qa-stranger-*@example.com` user to check isolation; delete
> such users from **Authentication → Users** afterwards.

### Good to know

- **Sharing a link.** "Copy link" only opens the entry for its owner. For public links, add a share token
  and a public read path, then use it in `ShareDialog`. Sharing the image already works for anyone.
- **The quick-log draft and the language** deliberately stay in `localStorage` (per-device UI state).
- **Sign-in with Google/Apple** is not set up; email + password only. Supabase supports more providers if
  you want them later (add a button that calls `signInWithOAuth`).

## Known limitations

- Editing an entry cannot change its place (create a new entry instead).
- No place editing or deleting UI yet (the repositories support both).
- The share card is drawn on a canvas, so it is verified in a browser, not in unit tests.
- With the local mock, data lives in one browser: clearing site data deletes the journal.
