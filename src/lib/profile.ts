/** Skill profile that Apertus extracts from the optimized CV and that drives the job search. */
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

const RESUME_KEY = 'optimizedResume';
const PROFILE_KEY = 'cvProfile';

function accountKey(key: string, userId: string) {
  return `${key}:${userId}`;
}

function removeLegacyData() {
  localStorage.removeItem(RESUME_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function saveProfile(profile: CvProfile | null, userId: string) {
  removeLegacyData();
  const key = accountKey(PROFILE_KEY, userId);
  if (profile) localStorage.setItem(key, JSON.stringify(profile));
  else localStorage.removeItem(key);
}

export function saveOptimization(optimizedText: string, profile: CvProfile | null, userId: string) {
  removeLegacyData();
  localStorage.setItem(accountKey(RESUME_KEY, userId), optimizedText);
  saveProfile(profile, userId);
}

/** Removes all CV data for one account when that account signs out. */
export function clearUserData(userId: string) {
  removeLegacyData();
  localStorage.removeItem(accountKey(RESUME_KEY, userId));
  localStorage.removeItem(accountKey(PROFILE_KEY, userId));
}

export function readOptimizedResume(userId: string) {
  removeLegacyData();
  return localStorage.getItem(accountKey(RESUME_KEY, userId)) || '';
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function list(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** Reads the stored profile back into a complete shape, so a partial entry cannot break rendering. */
export function readProfile(userId: string): CvProfile | null {
  removeLegacyData();
  const stored = localStorage.getItem(accountKey(PROFILE_KEY, userId));
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<CvProfile>;
    return {
      role: text(parsed.role),
      alternativeRoles: list(parsed.alternativeRoles),
      location: text(parsed.location),
      seniority: text(parsed.seniority),
      yearsExperience: Number.isFinite(parsed.yearsExperience) ? Number(parsed.yearsExperience) : 0,
      skills: list(parsed.skills),
      softSkills: list(parsed.softSkills),
      languages: list(parsed.languages),
      summary: text(parsed.summary),
    };
  } catch {
    return null;
  }
}

export function hasProfileContent(profile: CvProfile | null | undefined): profile is CvProfile {
  return Boolean(profile && (profile.role || profile.skills?.length));
}

export function describeProfile(profile: CvProfile) {
  const parts = [
    [profile.seniority, profile.role].filter(Boolean).join(' '),
    profile.yearsExperience ? `${profile.yearsExperience} years experience` : '',
    profile.location,
  ];
  return parts.filter(Boolean).join(' ' + String.fromCharCode(183) + ' ');
}
