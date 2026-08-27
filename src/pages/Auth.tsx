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
          <input id="password" type="password" placeholder="At least 6 characters" value={password}
            onChange={(event) => setPassword(event.target.value)} required minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'} />
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
