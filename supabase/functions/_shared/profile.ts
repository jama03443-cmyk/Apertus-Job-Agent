import { callApertusForJson } from './apertus.ts';

/** Structured skill profile that Apertus extracts from a CV and that drives the job search. */
export type CvProfile = {
  role: string;
  alternativeRoles: string[];
  location: string;
  seniority: string;
  yearsExperience: number;
  skills: string[];
  softSkills: string[];
  languages: string[];
  summary: string;
};

const EMPTY_PROFILE: CvProfile = {
  role: '',
  alternativeRoles: [],
  location: '',
  seniority: '',
  yearsExperience: 0,
  skills: [],
  softSkills: [],
  languages: [],
  summary: '',
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';
}

function cleanList(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const entry of value) {
    const text = cleanText(entry, 60);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    items.push(text);
    if (items.length >= maxItems) break;
  }
  return items;
}

/** Trims and de-duplicates whatever the model returned so the rest of the app can trust the shape. */
export function normalizeProfile(raw: unknown): CvProfile {
  const source = (raw || {}) as Record<string, unknown>;
  const years = Number(source.yearsExperience);
  return {
    role: cleanText(source.role, 80),
    alternativeRoles: cleanList(source.alternativeRoles, 4),
    location: cleanText(source.location, 60),
    seniority: cleanText(source.seniority, 30),
    yearsExperience: Number.isFinite(years) ? Math.max(0, Math.min(60, Math.round(years))) : 0,
    skills: cleanList(source.skills, 24),
    softSkills: cleanList(source.softSkills, 8),
    languages: cleanList(source.languages, 8),
    summary: cleanText(source.summary, 240),
  };
}

export function isUsableProfile(profile: CvProfile | null): profile is CvProfile {
  return Boolean(profile && (profile.role || profile.skills.length));
}

const EXTRACTION_PROMPT = [
  'You extract a structured skill profile from a CV. Return only valid JSON in this exact format:',
  '{"role":"","alternativeRoles":[],"location":"","seniority":"","yearsExperience":0,"skills":[],"softSkills":[],"languages":[],"summary":""}',
  'Rules:',
  '- role: the single most suitable job title for this candidate, written in English.',
  '- alternativeRoles: up to 4 other English job titles this candidate could apply for.',
  '- location: the city or region the candidate lives in, or an empty string when the CV does not state one.',
  '- seniority: one of Intern, Junior, Mid, Senior, Lead.',
  '- yearsExperience: total years of professional experience as a number.',
  '- skills: up to 20 concrete hard skills, tools, technologies, certifications, or methods named in the CV.',
  '- softSkills: up to 6 interpersonal strengths evidenced by the CV.',
  '- languages: spoken languages, each with its level when the CV states one, for example "German (native)".',
  '- summary: one English sentence describing the candidate.',
  'Write every value in English even when the CV uses another language, but keep proper nouns, product names, and technology names unchanged.',
  'Only use information present in the CV. Never invent skills, employers, or a location.',
].join('\n');

/** Asks Apertus for the candidate profile behind a CV. Throws when the reply is not usable JSON. */
export async function extractProfile(apiKey: string, cvText: string) {
  const parsed = await callApertusForJson<unknown>(apiKey, [
    { role: 'system', content: EXTRACTION_PROMPT },
    { role: 'user', content: cvText.slice(0, 14000) },
  ], 900);
  return normalizeProfile(parsed);
}

/** Same call, but a failure returns an empty profile instead of breaking the surrounding request. */
export async function extractProfileSafely(apiKey: string, cvText: string) {
  try {
    return await extractProfile(apiKey, cvText);
  } catch {
    return EMPTY_PROFILE;
  }
}

function skillPattern(skill: string) {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, 'i');
}

/** Splits the candidate skills into the ones a job posting mentions and the ones it does not. */
export function splitSkillsByJobText(skills: string[], jobText: string) {
  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of skills) {
    if (skillPattern(skill).test(jobText)) matched.push(skill);
    else missing.push(skill);
  }
  return { matched, missing };
}
