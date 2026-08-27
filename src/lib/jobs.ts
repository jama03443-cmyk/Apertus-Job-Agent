import { supabase } from './supabase';
import type { CvProfile } from './profile';

export function findJobs(resume: string, profile: CvProfile | null) {
  return supabase.functions.invoke('find-jobs', {
    body: { resume, profile },
  });
}
