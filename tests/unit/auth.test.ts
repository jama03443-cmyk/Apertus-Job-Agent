import { beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('../../src/lib/supabase', () => ({
  supabase: { auth: { signInWithOAuth: jest.fn() } },
}));

describe('Google OAuth', () => {
  let signInWithGoogle: (destination: string) => Promise<unknown>;
  let mockedSupabase: { auth: { signInWithOAuth: jest.Mock } };

  beforeAll(async () => {
    const auth = await import('../../src/lib/auth');
    const { supabase } = await import('../../src/lib/supabase');
    signInWithGoogle = auth.signInWithGoogle;
    mockedSupabase = supabase as unknown as { auth: { signInWithOAuth: jest.Mock } };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null });
  });

  test('starts Google login with the correct redirect URL', async () => {
    await signInWithGoogle('/optimize');

    expect(mockedSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost/optimize' },
    });
  });
});
