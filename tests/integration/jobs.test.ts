import { beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { CvProfile } from '../../src/lib/profile';

jest.mock('../../src/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

describe('job recommendations', () => {
  let findJobs: (resume: string, profile: CvProfile | null) => Promise<unknown>;
  let mockedSupabase: {
    functions: { invoke: jest.Mock };
  };
  const profile: CvProfile = {
    role: 'Software Developer',
    alternativeRoles: [],
    location: '',
    seniority: 'Mid',
    yearsExperience: 3,
    skills: ['JavaScript', 'React'],
    softSkills: [],
    languages: ['English'],
    summary: '',
  };

  beforeAll(async () => {
    const jobs = await import('../../src/lib/jobs');
    const { supabase } = await import('../../src/lib/supabase');
    findJobs = jobs.findJobs;
    mockedSupabase = supabase as unknown as { functions: { invoke: jest.Mock } };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSupabase.functions.invoke.mockResolvedValue({ data: { jobs: [] }, error: null });
  });

  test('requests jobs using the optimized CV skills', async () => {
    await findJobs('Optimized CV text', profile);

    expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith('find-jobs', {
      body: { resume: 'Optimized CV text', profile },
    });
  });
});
