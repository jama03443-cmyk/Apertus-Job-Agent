import { beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    storage: { from: jest.fn() },
    functions: { invoke: jest.fn() },
  },
}));

describe('CV upload and optimization', () => {
  let uploadAndOptimize: (file: File, userId: string) => Promise<{ optimizedText: string }>;
  let mockedSupabase: {
    storage: { from: jest.Mock };
    functions: { invoke: jest.Mock };
  };
  const upload = jest.fn();

  beforeAll(async () => {
    const resume = await import('../../src/lib/resume');
    const { supabase } = await import('../../src/lib/supabase');
    uploadAndOptimize = resume.uploadAndOptimize;
    mockedSupabase = supabase as unknown as {
      storage: { from: jest.Mock };
      functions: { invoke: jest.Mock };
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSupabase.storage.from.mockReturnValue({ upload });
    upload.mockResolvedValue({ error: null });
    mockedSupabase.functions.invoke.mockResolvedValue({
      data: { optimizedText: 'Improved CV', profile: null },
      error: null,
    });
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: () => 'test-file-id' },
    });
  });

  test('uploads a CV and sends its text for optimization', async () => {
    const file = new File(['JavaScript developer'], 'my cv.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'text', { value: async () => 'JavaScript developer' });

    const result = await uploadAndOptimize(file, 'user-123');

    expect(upload).toHaveBeenCalledWith(
      'user-123/test-file-id-my-cv.txt',
      file,
      { contentType: 'text/plain', upsert: false },
    );
    expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith('optimize-cv', {
      body: {
        fileName: 'user-123/test-file-id-my-cv.txt',
        text: 'JavaScript developer',
      },
    });
    expect(result.optimizedText).toBe('Improved CV');
  });

  test('rejects files larger than 5 MB before uploading', async () => {
    const file = new File(['small'], 'large.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 + 1 });

    await expect(uploadAndOptimize(file, 'user-123')).rejects.toThrow('smaller than 5 MB');
    expect(upload).not.toHaveBeenCalled();
  });
});
