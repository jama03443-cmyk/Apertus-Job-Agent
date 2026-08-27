# Apertus Job Agent

A SaaS platform powered by Swiss AI that helps candidates improve their CV and discover relevant job opportunities in Switzerland. It is built with React 19 and TypeScript, tested with Jest, and deployed on Vercel.

Apertus Job Agent combines AI-powered resume optimization, skill extraction, and current job recommendations in one simple workspace.

## Features

- Email/password authentication and Google sign-in through Supabase Auth
- Upload of PDF, DOCX, and TXT CVs
- Text extraction in the browser
- CV optimization in the original language with Swiss AI
- Skill profile extraction for job matching
- Current Swiss job listings from Adzuna
- Skill-based match scores and application links
- Private resume storage with Supabase Storage
- Demo subscription checkout
- Responsive landing page and workspace navigation

## User flow

1. The user signs up or signs in.
2. The user uploads a CV from the Optimize CV page.
3. The browser extracts the CV text and uploads the original file to private Supabase Storage.
4. The `optimize-cv` Edge Function sends the text to Apertus AI and returns the improved CV.
5. Apertus extracts a structured profile containing the candidate's skills.
6. The Jobs page searches Adzuna for current Swiss listings related to those skills.
7. The application calculates a simple skill-match score and provides an Apply link.

## Technology stack

- React 19
- TypeScript
- Vite
- React Router
- Supabase Auth, Storage, and Edge Functions
- Swiss AI / Apertus AI
- Adzuna Jobs API
- Jest for automated tests
- Vercel for deployment

## Getting started

### Requirements

- Node.js and npm
- A Supabase project
- An Apertus API key
- Adzuna API credentials for job recommendations

### Install and run locally

```bash
npm install
copy .env.example .env
npm run dev
```

For macOS or Linux, use `cp .env.example .env` instead of the `copy` command.

Open the local URL shown by Vite, usually `http://localhost:5173`.

## Environment configuration

Add the public Supabase values to `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Add the following values as Supabase Edge Function secrets. Do not put these values in `.env` or commit them to GitHub:

```text
APERTUS_API_KEY=your-apertus-key
APERTUS_API_URL=https://api.publicai.co/v1
APERTUS_MODEL=swiss-ai/apertus-v1.5-8b
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key
ADZUNA_COUNTRY=ch
```

`ADZUNA_COUNTRY=ch` limits recommendations to Switzerland. The job function searches by the skills extracted from the CV; users do not need to enter a search query.

## Supabase setup

1. Apply `supabase/migrations/202608030001_resume_storage.sql` to create the private resume bucket and its access policies.
2. Enable Email authentication under **Authentication > Providers**.
3. Configure Google OAuth if Google sign-in is required.
4. Add the Edge Function secrets listed above.
5. Deploy both functions:

```bash
supabase functions deploy optimize-cv
supabase functions deploy find-jobs
```

The Edge Functions validate the signed-in user before processing requests. The service-role key is used only inside the server-side function and must never be exposed in the frontend.

## Testing

Install dependencies and run the test suite:

```bash
npm install
npm test
```

Run the other project checks with:

```bash
npm run lint
npm run build
```

Tests are kept outside the application code:

```text
tests/
|-- unit/
|   `-- auth.test.ts
`-- integration/
    |-- jobs.test.ts
    `-- resume.test.ts
```

The tests cover the Google OAuth request, the CV upload and optimization request, file-size validation, and the job recommendation request. External services are mocked so the tests do not contact Google, Apertus, Supabase, or Adzuna.

## Deployment

The frontend is designed for deployment on Vercel. The included `vercel.json` keeps React Router routes working after a page refresh.

### Deploy the frontend

1. Push the repository to GitHub.
2. In Vercel, click **Add New > Project** and import `Apertus-Job-Agent`.
3. Keep the detected Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add these Environment Variables for **Preview** and **Production**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**.

After deployment, copy the Vercel URL and add it in Supabase under **Authentication > URL Configuration**:

- Site URL: `https://your-app.vercel.app`
- Redirect URL: `https://your-app.vercel.app/**`

The Supabase Edge Functions are deployed separately:

```bash
supabase functions deploy optimize-cv
supabase functions deploy find-jobs
```

Keep `APERTUS_API_KEY` and the Adzuna credentials in Supabase Edge Function secrets. They must not be added to Vercel frontend variables.

## Project structure

```text
src/
|-- components/
|   |-- RevealOnScroll.tsx
|   `-- WorkspaceLayout.tsx
|-- lib/
|   |-- auth.ts
|   |-- functionError.ts
|   |-- jobs.ts
|   |-- profile.ts
|   |-- resume.ts
|   `-- supabase.ts
|-- pages/
|   |-- Auth.tsx
|   |-- Jobs.tsx
|   |-- Landing.tsx
|   |-- Optimize.tsx
|   `-- Subscription.tsx
`-- styles/
    |-- auth.css
    |-- landing.css
    `-- optimize.css

supabase/
|-- functions/
|   |-- _shared/
|   |   |-- apertus.ts
|   |   `-- profile.ts
|   |-- find-jobs/index.ts
|   `-- optimize-cv/index.ts
`-- migrations/
    `-- 202608030001_resume_storage.sql
```

## MVP note

The subscription page currently demonstrates the payment flow with a Stripe test card. It does not create real subscriptions or charge real cards.
