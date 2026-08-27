import { supabase } from './supabase';
import type { CvProfile } from './profile';
import { getFunctionError } from './functionError';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function extractResumeText(file: File) {
  if (file.size > MAX_FILE_SIZE) throw new Error('The file must be smaller than 5 MB.');

  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.txt')) return file.text();

  if (fileName.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const document = await mammoth.default.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return document.value;
  }

  if (fileName.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    }

    return pages.join('\n');
  }

  throw new Error('Please upload a PDF, DOCX, or TXT file.');
}

export async function uploadAndOptimize(file: File, userId: string) {
  const text = (await extractResumeText(file)).trim();
  if (!text) throw new Error('No readable text was found in this file.');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const fileName = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const upload = await supabase.storage.from('resumes').upload(fileName, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const response = await supabase.functions.invoke('optimize-cv', {
    body: { fileName, text },
  });
  if (response.error) throw new Error(await getFunctionError(response.error, 'Resume optimization failed.'));
  if (!response.data?.optimizedText) throw new Error('The optimizer returned an empty result.');

  return {
    optimizedText: response.data.optimizedText as string,
    profile: response.data.profile as CvProfile | null,
  };
}
