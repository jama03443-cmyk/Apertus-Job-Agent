# CV Optimizer AI

A minimal resume optimizer built with React, Supabase Auth/Storage, and Apertus AI.

## MVP flow

1. Visit the landing page.
2. Create an account or sign in at `/auth`.
3. Upload a PDF, DOCX, or TXT resume at `/optimize`.
4. The browser extracts the text, Supabase stores the private original file, and the `optimize-cv` Edge Function sends the text to Apertus AI. CVs can be written in any language; Apertus returns the optimized CV in the source language.
5. Copy the optimized resume from the result panel.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set these frontend variables in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Set these as Supabase Edge Function secrets:

```text
APERTUS_API_KEY=your-apertus-key
APERTUS_API_URL=https://api.publicai.co/v1
APERTUS_MODEL=swiss-ai/apertus-v1.5-8b
```

Apply `supabase/migrations/202608030001_resume_storage.sql` to create the private `resumes` bucket and its policies, then deploy the function:

```bash
supabase functions deploy optimize-cv
```

## Structure

```text
src/
├── lib/supabase.ts
├── pages/Landing.tsx
├── pages/Auth.tsx
├── pages/Optimize.tsx
└── styles/
    ├── landing.css
    ├── auth.css
    └── optimize.css

supabase/functions/optimize-cv/index.ts
```

## Checks

```bash
npm run lint
npm run build
```
