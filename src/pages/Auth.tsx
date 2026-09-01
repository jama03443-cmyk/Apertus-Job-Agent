import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithGoogle } from '../lib/auth';
import { supabase } from '../lib/supabase';
import '../styles/auth.css';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const redirect = searchParams.get('redirect');
  const plan = searchParams.get('plan');
  const destination = redirect === '/subscription'
    ? `/subscription${plan ? `?plan=${encodeURIComponent(plan)}` : ''}`
    : '/';

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) navigate(destination, { replace: true });
    });
    return () => { active = false; };
  }, [destination, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const result = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${destination}` },
        });

    if (result.error) {
      setMessage(result.error.message);
    } else if (isLogin) {
      navigate(destination);
    } else {
      setMessage('Check your email to verify your account.');
      setIsLogin(true);
    }
    setLoading(false);
  }

  async function googleLogin() {
    setLoading(true);
    setMessage('');
    const { error } = await signInWithGoogle(destination);
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="authBox">
        <p className="authBrand"><img className="authFlag" src="/flag.webp" alt="Swiss flag" /> Apertus Job Agent</p>
        <h1>{isLogin ? 'Login' : 'Create Account'}</h1>
        <p className="authIntro">Use Apertus AI to make your resume clearer and more ATS-friendly.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" placeholder="you@example.com" value={email}
            onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          <label htmlFor="password">Password</label>
          <div className="passwordField">
            <input id="password" type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters" value={password}
              onChange={(event) => setPassword(event.target.value)} required minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'} />
            <button
              type="button"
              className="passwordToggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <svg className="eyeIcon" viewBox="0 0 24 24" aria-hidden="true">
                {showPassword ? (
                  <>
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </>
                ) : (
                  <>
                    <path d="M3 3l18 18" />
                    <path d="M10.6 5.9A10.7 10.7 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3.1 3.7M6.2 6.8C3.8 8.4 2.5 12 2.5 12s3.5 6.2 9.5 6.2c1.3 0 2.5-.3 3.5-.8" />
                  </>
                )}
              </svg>
            </button>
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}</button>
        </form>

        <div className="divider"><span>or</span></div>
        <button className="googleBtn" onClick={googleLogin} disabled={loading}>Continue with Google</button>

        <p className="switch">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setMessage(''); }}>
            {isLogin ? ' Sign Up' : ' Login'}
          </button>
        </p>
        {message && <p className="message" role="status">{message}</p>}
        <Link className="backLink" to="/">Back to home</Link>
      </div>
    </div>
  );
}
