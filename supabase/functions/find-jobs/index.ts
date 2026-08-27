import { createClient } from 'npm:@supabase/supabase-js@2';
import { extractProfileSafely, normalizeProfile, splitSkillsByJobText } from '../_shared/profile.ts';
import type { CvProfile } from '../_shared/profile.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AdzunaJob = {
  id?: string | number;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  description?: string;
  redirect_url?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function supabaseKey() {
  const directKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (directKey) return directKey;

  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}') as Record<string, string>;
    return keys.default || Object.values(keys)[0] || '';
  } catch {
    return '';
  }
}

async function searchAdzuna(appId: string, appKey: string, country: string, skill: string) {
  const query = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: skill,
    'content-type': 'application/json',
    results_per_page: '20',
  });
  const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${query}`);
  const data = await response.json() as { results?: AdzunaJob[] };
  if (!response.ok) throw new Error(`Adzuna returned ${response.status}.`);
  return data.results || [];
}

function scoreJob(profile: CvProfile, job: { title: string; description: string }) {
  const { matched, missing } = splitSkillsByJobText(profile.skills, `${job.title} ${job.description}`);
  const skillsToMatch = Math.max(1, Math.min(profile.skills.length, 8));
  const score = Math.round(Math.min(1, matched.length / skillsToMatch) * 90);
  const reason = matched.length
    ? `This role mentions ${matched.slice(0, 3).join(', ')} from your CV.`
    : 'Review this role against your experience.';

  return {
    score,
    reason,
    matchedSkills: matched.slice(0, 12),
    missingSkills: missing.slice(0, 8),
  };
}

function searchSkills(profile: CvProfile) {
  return [...new Set(profile.skills.filter((skill) => skill.length >= 3))].slice(0, 8);
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return jsonResponse({ error: 'You must be signed in.' }, 401);

  const authClient = createClient(Deno.env.get('SUPABASE_URL')!, supabaseKey(), {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return jsonResponse({ error: 'Invalid or expired session.' }, 401);

  const adzunaId = Deno.env.get('ADZUNA_APP_ID');
  const adzunaKey = Deno.env.get('ADZUNA_APP_KEY');
  const apertusKey = Deno.env.get('APERTUS_API_KEY');
  if (!adzunaId || !adzunaKey) return jsonResponse({ error: 'Adzuna is not configured yet.' }, 500);
  if (!apertusKey) return jsonResponse({ error: 'Apertus is not configured yet.' }, 500);

  try {
    const body = await request.json() as { resume?: string; profile?: unknown };
    const resume = body.resume?.trim();
    if (!resume) return jsonResponse({ error: 'Optimize a CV before searching for jobs.' }, 400);

    const savedProfile = normalizeProfile(body.profile);
    const profile = savedProfile.skills.length > 0
      ? savedProfile
      : await extractProfileSafely(apertusKey, resume);
    if (!profile.skills.length) return jsonResponse({ error: 'We could not identify professional skills in this CV.' }, 400);

    const country = (Deno.env.get('ADZUNA_COUNTRY') || 'ch').toLowerCase();
    const location = country === 'ch' ? 'Switzerland' : profile.location || '';
    const jobsById = new Map<string, AdzunaJob>();

    for (const skill of searchSkills(profile)) {
      const jobs = await searchAdzuna(adzunaId, adzunaKey, country, skill);
      for (const job of jobs) {
        const id = String(job.id || job.redirect_url || '');
        if (id) jobsById.set(id, job);
        if (jobsById.size >= 40) break;
      }
      if (jobsById.size >= 40) break;
    }

    const rankedJobs = [...jobsById.values()]
      .map((job) => {
        const formatted = {
          id: String(job.id || job.redirect_url || ''),
          title: job.title || 'Untitled role',
          company: job.company?.display_name || 'Company not listed',
          location: job.location?.display_name || location || 'Location not listed',
          description: job.description || '',
          url: job.redirect_url || '',
        };
        return { ...formatted, ...scoreJob(profile, formatted) };
      })
      .filter((job) => job.matchedSkills.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return jsonResponse({
      jobs: rankedJobs,
      search: { role: 'Jobs matching your skills', location, country },
      profile,
    });
  } catch (caught) {
    return jsonResponse({ error: caught instanceof Error ? caught.message : 'Job search failed.' }, 500);
  }
});
