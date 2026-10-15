# CLAUDE.md

## Project

**Mi Diario** (package name `mi-diario`; the Figma design is titled "Restaurant Journal") is a mobile-first
food journal for restaurants, wineries and street food. Users log a meal (place, photo, reaction), browse
entries like a scrapbook, keep a wishlist, search/filter, and share an entry as an image.

Data goes through a repository layer. With no configuration it runs on local mock data (`localStorage`);
with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` it uses Supabase (Postgres, Auth,
Storage). See `README.md` for full details.

## Tech stack (from `package.json` and config files)

- **Language/tooling:** TypeScript 6 (strict, `noUncheckedIndexedAccess`), Vite 8, ESM
- **UI:** React 19, React Router 7 (`react-router-dom`)
- **Styling:** Tailwind CSS 4 via `@tailwindcss/vite`; tokens live in `@theme` in `src/index.css`
- **Fonts:** `@fontsource-variable/fraunces` (display), `@fontsource-variable/inter` (sans)
- **Data/state:** TanStack Query 5, `@supabase/supabase-js`
- **Forms/validation:** react-hook-form, zod, `@hookform/resolvers`
- **i18n:** i18next + react-i18next (`es-AR` default, `en`)
- **Tests:** Vitest + jsdom, React Testing Library, user-event, axe-core
- **Lint/format:** ESLint 9 (`jsx-a11y`, react-hooks, react-refresh), Prettier (no semicolons, single
  quotes, trailing commas, 100 cols, `prettier-plugin-tailwindcss`)
- **Alias:** `@/*` -> `src/*`

### Commands

| Command                | Purpose                          |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Dev server on :5173              |
| `npm run build`        | `tsc -b` + `vite build`          |
| `npm run lint`         | ESLint                           |
| `npm test`             | Vitest                           |
| `npm run format`       | Prettier                         |
| `npm run test:supabase`| Contract tests against Supabase  |

## Project structure

```
src/
  app/          router, providers, layout shell (TabBar, SideNav, LogFab, LanguageToggle), 404/error pages
  components/   shared UI: Button, buttonStyles, Modal, ChoiceGroup, TextField, TagInput, PhotoField,
                EntryPhoto, EntryBadges, Icon, Empty/Error/LoadingState, choiceFields, reactionMeta
  data/         repository interfaces, mock/ (localStorage), supabase/, RepositoryProvider, createRepositories
  features/     auth, journal, entry, log, search, wishlist, share, entryForm
  hooks/        TanStack Query hooks (the only data API UI code calls)
  i18n/         es-AR.json, en.json (keys are type-checked)
  lib/          pure helpers (filters, format, date, image, errors, ids)
  test/         test utilities
  types/        domain types (Place, Entry, WishlistItem, UserPreferences)
supabase/migrations/   SQL schema + RLS
```

Architecture rule: screens never touch data directly. Pages/components -> `src/hooks` -> repository
interfaces -> mock or Supabase implementation. UI must not import from `src/data/mock` (ESLint enforces it).
`src/data/createRepositories.ts` is the single place that picks mock vs Supabase.

## Design tokens

Two sources exist and they **differ**. The Figma file (node `6-265`, "Canvas", 1440px-wide desktop
screens) is the design reference; `src/index.css` is what the app currently implements. Do not silently
mix them; when implementing from Figma, flag differences and ask before changing existing tokens.

### Figma (file `VDpPlWJvrMYs90infbxq8N`)

Named variables (from `get_variable_defs`):

| Variable           | Value     | Observed use                                  |
| ------------------ | --------- | --------------------------------------------- |
| `Orange`           | `#bc592d` | Primary CTA fill, cuisine label, "New" badge  |
| `Gold`             | `#e29e4b` | Defined; star fill likely (not confirmed)     |
| `White`            | `#ffffff` | Cards, button text on dark/orange             |
| `Eggshell`         | `#e6dfd6` | Borders and dividers                          |
| `Faded brown`      | `#6b5a52` | Secondary text                                |
| `color/green/22`   | `#007113` | "Favorite" badge fill                         |
| `star/muted`       | `#525252` | "Recent" badge text                           |
| `color/orange/89`  | `#e5e3df` | "Recent" badge fill                           |

Unnamed (raw hex used in frames): `#faf7f2` page/nav background, `#2d1b14` primary text and the filled
"Sign Up" button.

**Typography**

| Role                    | Font                    | Size / line-height | Weight   |
| ----------------------- | ----------------------- | ------------------ | -------- |
| Hero heading            | Playfair Display        | 64 / 1.1           | Bold     |
| Wordmark, card title    | Playfair Display        | 24 / normal        | Bold     |
| Feature card title      | Playfair Display        | 20 / normal        | Bold     |
| Review quote            | Playfair Display        | 15 / 1.4           | Regular  |
| Hero body               | Inter                   | 18 / 1.6           | Regular  |
| Body (feature cards)    | Inter                   | 14 / 1.5           | Regular  |
| Button label            | Inter                   | 14 / normal        | SemiBold |
| Location, footer        | Inter                   | 13 / normal        | Regular  |
| Meta (date, bullet)     | Inter                   | 12 / normal        | Regular  |
| Cuisine label           | Inter                   | 12 / normal        | Bold, uppercase |
| Badge                   | Inter                   | 10 / normal        | Bold, uppercase |

**Spacing** (values observed in auto-layout): 2 (star gap), 4, 8, 16, 20, 24, 32, 40, 64, 80.
Common usage: page gutter 64; section padding 64 vertical; hero gap 64; card padding 32 (feature) /
24 (journal card); grid gap 16 (photos) / 32 (cards); button padding 24 horizontal, 48 high; nav 88 high;
footer 48 vertical padding.

**Border radii:** 4 (badges), 8 (buttons), 16 (cards). Borders are 1px `#e6dfd6`; a "New" journal
card uses a 2px `#bc592d` border.

**Components seen in Figma:** nav, button (primary / outline), feature card, Journal-card (240px high,
240px image, "New" variant), Badge (Default "New", Variant2 "Favorite", Variant3 "Recent"), Star /
Star group (16px, 2px gap, selected/unselected), navigation buttons.

### Implemented in code (`src/index.css`, `@theme`)

| Token                     | Value                                                                    |
| ------------------------- | ------------------------------------------------------------------------ |
| `--color-paper`           | `#fbf6ee` (page background)                                              |
| `--color-paper-deep`      | `#f3eadb`                                                                |
| `--color-card`            | `#fffdf9`                                                                |
| `--color-line`            | `#e3d6c2`                                                                |
| `--color-ink`             | `#2b211c`                                                                |
| `--color-ink-soft`        | `#6b5b50`                                                                |
| `--color-terracotta`      | `#b4452b` (primary)                                                      |
| `--color-terracotta-deep` | `#8f3520`                                                                |
| `--color-olive`           | `#5c6b3a`                                                                |
| `--color-wine`            | `#6e1f3a` (danger, invalid, focus ring)                                  |
| `--color-mustard`         | `#e0a93b`                                                                |
| `--font-display`          | `'Fraunces Variable'`, serif fallback (h1-h3, `letter-spacing: -0.01em`) |
| `--font-sans`             | `'Inter Variable'`, sans fallback                                        |
| `--radius-card`           | `1rem`                                                                   |
| `--shadow-polaroid`       | `0 1px 2px rgb(43 33 28 / 0.08), 0 6px 16px -4px rgb(43 33 28 / 0.18)`  |
| `--shadow-fab`            | `0 4px 6px -1px rgb(43 33 28 / 0.2), 0 10px 24px -6px rgb(180 69 43 / 0.5)` |

Known Figma-vs-code differences: display font (Playfair Display vs Fraunces), primary orange
(`#bc592d` vs `#b4452b`), ink (`#2d1b14` vs `#2b211c`), border (`#e6dfd6` vs `#e3d6c2`), secondary text
(`#6b5a52` vs `#6b5b50`), and button shape (Figma 8px radius vs code `rounded-full`). Button height
matches (48px / `min-h-12`). Resolve with the user before aligning either side.

## Component conventions

- Use function components with typed props; extend native element props (see `Button.tsx`) and spread the
  rest onto the element. Default `type="button"`.
- Style with Tailwind utilities using the theme tokens (`bg-terracotta`, `text-ink-soft`, `rounded-card`);
  do not hard-code hex values in components. Add new tokens to `@theme` in `src/index.css`.
- Shared look-and-feel lives in helpers such as `buttonStyles(variant, fullWidth)` so links styled as
  buttons match `<Button>`. Button variants: `primary`, `secondary`, `ghost`, `danger`.
- Reuse `src/components` before creating new UI; feature-specific pieces go in `src/features/<feature>`.
- All user-facing strings go through `react-i18next`; add keys to **both** `es-AR.json` and `en.json`
  (the build fails on missing keys). No hardcoded strings in components.
- Data access only via hooks in `src/hooks`. Failures surface as `RepositoryError` codes; show a friendly
  message with retry, and provide loading/empty/error states for every screen.
- Tests live next to code (`*.test.tsx`); use utilities in `src/test`.
- Follow Prettier: no semicolons, single quotes, 100 columns.

## Responsive behavior

- Mobile-first. Bottom tab bar on phones, side nav from tablet up (`TabBar`, `SideNav`), with a floating
  "+ Log" action (`LogFab`).
- Figma only provides 1440px desktop frames. Its annotations say feature cards "should stack on mobile".
  Anything else for small breakpoints is not specified in the design; follow existing code patterns rather
  than inventing values.
- Never rely on hover alone; touch targets are at least 44px (buttons use `min-h-12`).

## Accessibility

- Semantic HTML, a skip link, labels on every input, alt text on meaningful images (`alt=""` for
  decorative), 44px+ tap targets.
- Visible focus: global `:focus-visible` is a 3px `wine` outline with 2px offset; `[aria-invalid='true']`
  gets a wine border. Do not remove outlines.
- Modals trap focus and restore it on close.
- Respect `prefers-reduced-motion` (handled globally in `src/index.css`).
- Contrast must meet WCAG AA (4.5:1 for normal text); measured values are documented in `src/index.css`.
  Re-check any new color pairing, including Figma colors such as `#6b5a52` on `#faf7f2`.
- `eslint-plugin-jsx-a11y` is enabled and an axe-core audit runs in `src/test/a11y.test.tsx`; keep both
  passing.
