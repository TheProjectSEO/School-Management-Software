# Repository Guidelines

## Project Structure & Module Organization
- Root: two Next.js apps with Supabase + Tailwind.
- `student-app/`: routes in `app/`, UI in `components/`, utilities in `lib/`, hooks in `hooks/`, assets in `public/`, Supabase config in `supabase/`, docs in `docs/`.
- `teacher-app/`: similar layout (`app/`, `components/`, `lib/`, `hooks/`, `public/`, `supabase/`).
- Config: `.env.local` per app (see `.env.local.example`).

## Build, Test, and Development Commands
- Root dev (both apps): `npm run dev` (starts student :3000 and teacher :3001).
- Student dev: `cd student-app && npm run dev`. Teacher dev: `cd teacher-app && npm run dev`.
- Build all: `npm run build`. Start individually: `npm run start:student` / `npm run start:teacher`.
- Lint: `npm run lint` (per-app via root scripts). Type check: `npm run typecheck` (teacher-app).
- Utilities: `student-app/scripts/create-test-user.mjs` via `npm run create-test-user`. Supabase types (teacher): `npm run gen-types` (requires `SUPABASE_PROJECT_ID`).

## Coding Style & Naming Conventions
- Language: TypeScript + React (App Router).
- Linting: ESLint with Next.js config; fix warnings before PR.
- Styling: TailwindCSS. Prefer utility-first classes; co-locate component styles.
- Indentation: 2 spaces; max 120 cols; avoid long props on one line.
- Names: components `PascalCase` (e.g., `UserCard.tsx`), hooks `useCamelCase` (`useAuth.ts`), route segments `kebab-case` under `app/`.

## Testing Guidelines
- No formal test runner configured. Validate via:
  - Lint/type checks pass (`npm run lint`, `npm run type-check`).
  - Manual QA: follow `student-app/TESTING_GUIDE.md` and relevant feature READMEs.
  - Include repro steps and screenshots for UI changes.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits with scoped prefixes, e.g. `feat(student): add notes panel`, `fix(teacher): correct attendance filter`.
- PRs must include: clear description, linked issue, screenshots/recordings for UI, env/setup notes if applicable.
- Pre-submit: ensure both apps build and lint; note any migrations or Supabase type changes.

## Security & Configuration Tips
- Never commit `.env.local`. Required vars:
  - Both apps: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Teacher only: `SUPABASE_PROJECT_ID` (for `gen-types`).
- Prefer local secrets; avoid leaking keys in logs or screenshots.
