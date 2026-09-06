# Evaluación Oral — Primaria

Web app for elementary school teachers to apply oral evaluations to their
students on a tablet. See `docs/CLAUDE.md` for the full product specification.

## Stack

Next.js 16 (App Router, Turbopack) · shadcn/ui · Tailwind CSS v4 · Supabase
(Postgres + Auth + RLS) · Vercel.

## Local setup

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with the Supabase keys of the project:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

## Database

The schema, the RLS policies and the signup domain restriction live in
`supabase/migrations/`. Apply them to the linked project:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Regenerate the TypeScript types after a schema change:

```bash
supabase gen types typescript --linked > src/lib/database.types.ts
```

## Rules the schema enforces

- Only `@institutocolon.mx` addresses can sign up (trigger on `auth.users`).
- Every table is filtered by `teacher_id = auth.uid()` through RLS. Teachers
  never see each other's data.
- A row in `item_responses` means the question was answered. No row means the
  teacher has not marked it yet.
- A row in `section_scores` exists only when the teacher overrides the
  calculated score.

## Checks

```bash
npm test         # score calculation
npm run lint
npm run build
```
