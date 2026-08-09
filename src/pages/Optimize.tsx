import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { supabase } from '../lib/supabase';
import '../styles/optimize.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
type Section = 'optimize' | 'find-job' | 'subscription';

async function extractText(file: File) {
  if (file.size > MAX_FILE_SIZE) throw new Error('The file must be smaller than 5 MB.');

  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.txt')) return file.text();

  if (fileName.endsWith('.docx')) {
    const document = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return document.value;
  }

  if (fileName.endsWith('.pdf')) {
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

async function getFunctionError(error: unknown) {
  const responseError = error as { message?: string; context?: unknown };
  if (!(responseError.context instanceof Response)) {
    return responseError.message || 'Resume optimization failed.';
  }

  const responseText = await responseError.context.text();
  try {
    const responseBody = JSON.parse(responseText) as { error?: string; message?: string };
    return responseBody.error || responseBody.message || responseError.message || 'Resume optimization failed.';
  } catch {
    return responseText || responseError.message || 'Resume optimization failed.';
  }
}

export default function Optimize() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>('optimize');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/auth', { replace: true });
    });
  }, [navigate]);

  async function optimizeResume() {
    if (!file) {
      setMessage('Choose a CV first.');
      return;
    }

    setLoading(true);
    setMessage('');
    setResult('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Your session has expired. Please log in again.');

      const text = (await extractText(file)).trim();
      if (!text) throw new Error('No readable text was found in this file.');

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const upload = await supabase.storage.from('resumes').upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const response = await supabase.functions.invoke('optimize-cv', {
        body: { fileName: storagePath, text },
      });
      if (response.error) throw new Error(await getFunctionError(response.error));
      if (!response.data?.optimizedText) throw new Error('The optimizer returned an empty result.');

      setResult(response.data.optimizedText);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The resume could not be optimized.');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div className="optimize">
      <div className="dashboardShell">
        <aside className="dashboardSidebar">
          <Link to="/" className="sidebarBrand"><span>*</span><strong>CV Optimizer</strong></Link>
          <p className="sidebarLabel">Workspace</p>
          <nav className="sidebarNav">
            <button className={activeSection === 'optimize' ? 'active' : ''} onClick={() => setActiveSection('optimize')}><span>*</span> Optimize CV</button>
            <button className={activeSection === 'find-job' ? 'active' : ''} onClick={() => setActiveSection('find-job')}><span>?</span> Find Job</button>
            <button className={activeSection === 'subscription' ? 'active' : ''} onClick={() => setActiveSection('subscription')}><span>+</span> Subscription</button>
          </nav>
          <div className="sidebarFooter"><button onClick={logout}>-&gt; <span>Sign out</span></button></div>
        </aside>

        <main className="dashboardMain">
          <div className="container">
            {activeSection === 'optimize' && <OptimizeSection file={file} loading={loading} message={message} result={result} onFileChange={setFile} onOptimize={optimizeResume} onLogout={logout} />}
            {activeSection === 'find-job' && <PlaceholderSection title="Find your next job" text="Search for roles that match your experience and discover opportunities worth applying to." onBack={() => setActiveSection('optimize')} />}
            {activeSection === 'subscription' && <SubscriptionSection onChoose={() => setActiveSection('optimize')} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function OptimizeSection({ file, loading, message, result, onFileChange, onOptimize, onLogout }: {
  file: File | null;
  loading: boolean;
  message: string;
  result: string;
  onFileChange: (file: File | null) => void;
  onOptimize: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <header className="top"><div><p className="eyebrow">Resume workspace</p><h1>Resume Optimizer</h1></div><button className="logoutBtn" onClick={onLogout}>Sign out</button></header>
      <section className="optimizerCard">
        <label className="uploadBox" htmlFor="resume-file">
          <span className="uploadIcon">+</span>
          <strong>{file ? file.name : 'Choose your CV in any language'}</strong>
          <span>PDF, DOCX, or TXT - maximum 5 MB</span>
        </label>
        <input id="resume-file" type="file" accept=".pdf,.docx,.txt" onChange={(event) => onFileChange(event.target.files?.[0] || null)} />
        <button className="optimizeBtn" onClick={onOptimize} disabled={loading}>{loading ? 'Optimizing...' : 'Optimize Resume'}</button>
        {message && <p className="message" role="alert">{message}</p>}
      </section>
      {result && <section className="resultCard"><h2>Your optimized resume</h2><textarea value={result} readOnly /><button className="copyBtn" onClick={() => navigator.clipboard.writeText(result)}>Copy result</button></section>}
    </>
  );
}

function PlaceholderSection({ title, text, onBack }: { title: string; text: string; onBack: () => void }) {
  return <section className="comingPanel"><span className="comingIcon">?</span><p className="eyebrow">Coming next</p><h1>{title}</h1><p>{text}</p><button className="comingButton" onClick={onBack}>Back to Optimize CV</button></section>;
}

function SubscriptionSection({ onChoose }: { onChoose: () => void }) {
  return <section className="subscriptionPanel"><p className="eyebrow">Your workspace</p><h1>Choose your subscription</h1><p className="subscriptionIntro">Select the plan that fits the pace of your job search.</p><div className="dashboardPlans"><Plan name="Starter" price="Free" text="For one focused resume refresh." onChoose={onChoose} /><Plan name="Professional" price="Pro" text="For an active job search." featured onChoose={onChoose} /><Plan name="Career Plus" price="Premium" text="For a complete career move." onChoose={onChoose} /></div></section>;
}

function Plan({ name, price, text, featured = false, onChoose }: { name: string; price: string; text: string; featured?: boolean; onChoose: () => void }) {
  return <article className={`dashboardPlan ${featured ? 'featuredPlan' : ''}`}>{featured && <span className="popularBadge">Most popular</span>}<span className="planLabel">{name}</span><h2>{price}</h2><p>{text}</p><ul><li>+ CV optimization</li><li>+ ATS-friendly rewrite</li><li>+ Copy your result</li></ul><button className={`planButton ${featured ? '' : 'secondaryPlanButton'}`} onClick={onChoose}>Choose {name}</button></article>;
}
