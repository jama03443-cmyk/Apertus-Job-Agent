import { createClient } from 'npm:@supabase/supabase-js@2';
import { callApertus } from '../_shared/apertus.ts';
import { extractProfileSafely } from '../_shared/profile.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function getSupabasePublishableKey() {
  const directKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (directKey) return directKey;
  const keyDictionary = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (!keyDictionary) return '';
  try {
    const parsed = JSON.parse(keyDictionary) as Record<string, string>;
    return parsed.default || Object.values(parsed)[0] || '';
  } catch {
    return '';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'You must be signed in.' }, 401);

  const authClient = createClient(Deno.env.get('SUPABASE_URL')!, getSupabasePublishableKey(), { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return jsonResponse({ error: 'Invalid or expired session.' }, 401);

  const apiKey = Deno.env.get('APERTUS_API_KEY');
  if (!apiKey) return jsonResponse({ error: 'APERTUS_API_KEY is not configured.' }, 500);

  try {
    const body = await req.json() as { fileName?: string; text?: string };
    const fileName = body.fileName || '';
    if (fileName && !fileName.startsWith(`${user.id}/`)) return jsonResponse({ error: 'You can only process your own resume.' }, 403);

    let text = body.text?.trim() || '';
    if (!text && fileName) {
      const storageClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const download = await storageClient.storage.from('resumes').download(fileName);
      if (download.error) throw download.error;
      text = (await download.data.text()).trim();
    }
    if (!text) return jsonResponse({ error: 'No resume text was provided.' }, 400);

    const optimizedText = await callApertus(apiKey, [
      { role: 'system', content: 'You are an expert resume writer for multilingual CVs. Detect the source language of the CV and write the complete optimized CV in that same language. Never translate it and never default to English. Preserve every factual detail, name, technical term, and the original meaning. Improve wording, clarity, structure, and ATS compatibility. Return only the optimized CV.' },
      { role: 'user', content: text.slice(0, 18000) },
    ]);
    if (!optimizedText) return jsonResponse({ error: 'Apertus returned an empty result.' }, 502);

    // The profile powers the job search. A failed extraction must not cost the user their optimized CV.
    const profile = await extractProfileSafely(apiKey, optimizedText);
    return jsonResponse({ optimizedText, profile });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Resume optimization failed.' }, 500);
  }
});
