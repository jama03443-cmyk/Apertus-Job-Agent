import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { describeProfile, hasProfileContent, saveOptimization } from '../lib/profile';
import type { CvProfile } from '../lib/profile';
import { uploadAndOptimize } from '../lib/resume';
import WorkspaceLayout from '../components/WorkspaceLayout';

export default function Optimize() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [profile, setProfile] = useState<CvProfile | null>(null);
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
    setProfile(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Your session has expired. Please log in again.');

      const response = await uploadAndOptimize(file, user.id);
      const extractedProfile = hasProfileContent(response.profile) ? response.profile : null;
      saveOptimization(response.optimizedText, extractedProfile, user.id);
      setResult(response.optimizedText);
      setProfile(extractedProfile);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The resume could not be optimized.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <WorkspaceLayout activePage="optimize">
      <OptimizeSection file={file} loading={loading} message={message} result={result} profile={profile} onFileChange={setFile} onOptimize={optimizeResume} />
    </WorkspaceLayout>
  );
}

function SkillPanel({ profile }: { profile: CvProfile }) {
  const headline = describeProfile(profile);

  return (
    <section className="skillCard">
      <div className="skillCardTop">
        <div>
          <h2>Skills Apertus found in your CV</h2>
          {headline && <p className="skillHeadline">{headline}</p>}
        </div>
        <Link className="findJobsButton" to="/jobs">Find matching jobs</Link>
      </div>
      {profile.summary && <p className="skillSummary">{profile.summary}</p>}

      {profile.skills.length > 0 && (
        <div className="skillGroup">
          <p className="skillGroupLabel">Professional skills</p>
          <ul className="chipList">{profile.skills.map((skill) => <li className="chip" key={skill}>{skill}</li>)}</ul>
        </div>
      )}
      {profile.softSkills.length > 0 && (
        <div className="skillGroup">
          <p className="skillGroupLabel">Strengths</p>
          <ul className="chipList">{profile.softSkills.map((skill) => <li className="chip chipMuted" key={skill}>{skill}</li>)}</ul>
        </div>
      )}
      {profile.languages.length > 0 && (
        <div className="skillGroup">
          <p className="skillGroupLabel">Languages</p>
          <ul className="chipList">{profile.languages.map((language) => <li className="chip chipMuted" key={language}>{language}</li>)}</ul>
        </div>
      )}
      {profile.alternativeRoles.length > 0 && (
        <div className="skillGroup">
          <p className="skillGroupLabel">Roles we will search for</p>
          <ul className="chipList">{[profile.role, ...profile.alternativeRoles].filter(Boolean).map((role) => <li className="chip chipRole" key={role}>{role}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

function OptimizeSection({ file, loading, message, result, profile, onFileChange, onOptimize }: {
  file: File | null;
  loading: boolean;
  message: string;
  result: string;
  profile: CvProfile | null;
  onFileChange: (file: File | null) => void;
  onOptimize: () => void;
}) {
  return (
    <>
      <header className="top"><div><p className="eyebrow">Resume workspace</p><h1>Resume Optimizer</h1></div></header>
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
      {profile && <SkillPanel profile={profile} />}
      {result && (
        <section className="resultCard">
          <h2>Your optimized resume</h2>
          <textarea value={result} readOnly />
          <div className="resultActions">
            <button className="copyBtn" onClick={() => navigator.clipboard.writeText(result)}>Copy result</button>
            <Link className="findJobsButton" to="/jobs">Find matching jobs</Link>
          </div>
        </section>
      )}
    </>
  );
}
