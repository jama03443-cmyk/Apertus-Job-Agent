import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { describeProfile, hasProfileContent, readOptimizedResume, readProfile, saveProfile } from '../lib/profile';
import type { CvProfile } from '../lib/profile';
import { findJobs } from '../lib/jobs';
import { getFunctionError } from '../lib/functionError';
import WorkspaceLayout from '../components/WorkspaceLayout';

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  score: number;
  reason: string;
  matchedSkills: string[];
  missingSkills: string[];
};

function scoreClass(score: number) {
  if (score >= 75) return 'jobScore scoreStrong';
  if (score >= 45) return 'jobScore scoreMedium';
  return 'jobScore scoreLow';
}

export default function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<CvProfile | null>(null);
  const [location, setLocation] = useState('Switzerland');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);

  const loadRecommendations = useCallback(async (userId: string) => {
    const request = ++requestId.current;
    const resume = readOptimizedResume(userId);
    if (!resume) {
      setMessage('Optimize your CV first. We will then extract your skills and find suitable jobs.');
      return;
    }

    const savedProfile = readProfile(userId);
    setProfile(savedProfile);
    setLoading(true);
    setMessage('');
    setJobs([]);

    try {
      const response = await findJobs(resume, savedProfile);
      if (request !== requestId.current) return;
      if (response.error) throw new Error(await getFunctionError(response.error, 'We could not find matching jobs.'));

      setJobs(response.data?.jobs || []);
      setLocation(response.data?.search?.location || 'Switzerland');
      if (hasProfileContent(response.data?.profile)) {
        setProfile(response.data.profile);
        saveProfile(response.data.profile, userId);
      }
      if (!response.data?.jobs?.length) setMessage('No suitable current jobs were found right now.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not find matching jobs.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let currentUserId = '';

    function clearResults() {
      requestId.current += 1;
      currentUserId = '';
      setJobs([]);
      setProfile(null);
      setLocation('Switzerland');
      setMessage('');
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        clearResults();
        navigate('/auth', { replace: true });
        return;
      }

      currentUserId = session.user.id;
      void loadRecommendations(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        clearResults();
        return;
      }

      if (currentUserId && currentUserId !== session.user.id) {
        clearResults();
      }

      currentUserId = session.user.id;
      void loadRecommendations(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [loadRecommendations, navigate]);

  async function refreshRecommendations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) void loadRecommendations(user.id);
  }

  return (
    <WorkspaceLayout activePage="jobs">
      <header className="top">
        <div><p className="eyebrow">Job recommendations</p><h1>Jobs for you</h1></div>
      </header>

      <div className="recommendationBar">
        <p>{loading ? 'Reading your skills and finding current jobs...' : `Recommended jobs in ${location}.`}</p>
        <button onClick={refreshRecommendations} disabled={loading}>{loading ? 'Loading...' : 'Refresh recommendations'}</button>
      </div>

      {hasProfileContent(profile) && (
        <section className="profileBar">
          <div className="profileBarTop">
            <p className="skillGroupLabel">Matching on your skills</p>
            {describeProfile(profile) && <span className="profileMeta">{describeProfile(profile)}</span>}
          </div>
          {profile.skills.length > 0 && <ul className="chipList">{profile.skills.map((skill) => <li className="chip" key={skill}>{skill}</li>)}</ul>}
        </section>
      )}

      {message && <p className="message" role="alert">{message}</p>}
      <div className="jobResults">
        {jobs.map((job) => (
          <article className="jobCard" key={job.id}>
            <div className="jobCardTop">
              <div><h2>{job.title}</h2><p>{job.company} - {job.location}</p></div>
              <strong className={scoreClass(job.score)}>{job.score}% match</strong>
            </div>
            <p className="jobReason">{job.reason}</p>
            {job.matchedSkills?.length > 0 && <SkillList title="Your matching skills" skills={job.matchedSkills} className="chipMatch" />}
            {job.missingSkills?.length > 0 && <SkillList title="Not covered by your CV" skills={job.missingSkills} className="chipGap" />}
            <p className="jobDescription">{job.description}</p>
            {job.url && <div className="jobCardActions"><a className="applyButton" href={job.url} target="_blank" rel="noreferrer">Apply</a><a className="jobLink" href={job.url} target="_blank" rel="noreferrer">Jobs by Adzuna</a></div>}
          </article>
        ))}
      </div>
    </WorkspaceLayout>
  );
}

function SkillList({ title, skills, className }: { title: string; skills: string[]; className: string }) {
  return (
    <div className="jobSkills">
      <p className="skillGroupLabel">{title}</p>
      <ul className="chipList">{skills.map((skill) => <li className={`chip ${className}`} key={skill}>{skill}</li>)}</ul>
    </div>
  );
}
