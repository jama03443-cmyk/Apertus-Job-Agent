import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/landing.css';

type UserSession = {
  user: {
    email?: string;
    user_metadata?: { full_name?: string };
  };
} | null;

const features = [
  ['spark', 'Resume optimization', 'Improve wording and structure for a stronger application.'],
  ['arrow', 'Quick results', 'Get a polished version of your CV in a few seconds.'],
  ['check', 'Secure upload', 'Your document stays inside your private workspace.'],
];

const steps = [
  ['01', 'Upload', 'Choose your CV in PDF, DOCX, or TXT format.'],
  ['02', 'Optimize', 'Review and improve your resume with one click.'],
  ['03', 'Apply', 'Copy your polished CV and move forward with confidence.'],
];

const plans = [
  { name: 'Starter', price: 'Free', text: 'A focused first step for one resume.', items: ['1 CV optimization', 'ATS-friendly rewrite', 'Copy your result'], featured: false },
  { name: 'Professional', price: 'Pro', text: 'For an active job search with more applications.', items: ['Multiple CV optimizations', 'Application workspace', 'Job search workspace'], featured: true },
  { name: 'Career Plus', price: 'Premium', text: 'A complete workspace for a serious career move.', items: ['Unlimited CV improvements', 'Find Job workspace', 'Personal application plan'], featured: false },
];

export default function Landing() {
  const [session, setSession] = useState<UserSession>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (mounted) setSession(currentSession);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) setSession(currentSession);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const accountName = session?.user.user_metadata?.full_name || session?.user.email || 'Account';
  const accountInitial = accountName.charAt(0).toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
    setAccountMenuOpen(false);
  }

  return (
    <div className="landing">
      <nav className="navbar">
        <Link to="/" className="brand"><span className="brandMark">*</span> CV Optimizer AI</Link>

        <div className="navLinks">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
        </div>

        {session ? (
          <div className="accountMenu">
            <button className="accountButton" onClick={() => setAccountMenuOpen(!accountMenuOpen)} aria-expanded={accountMenuOpen}>
              <span className="accountInitial">{accountInitial}</span>
              <span className="accountChevron">v</span>
            </button>
            {accountMenuOpen && (
              <div className="accountDropdown">
                <div className="accountDetails"><strong>{accountName}</strong><span>Signed in</span></div>
                <Link to="/optimize" onClick={() => setAccountMenuOpen(false)}>Dashboard <span>-&gt;</span></Link>
                <button onClick={signOut}>Sign out</button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/auth" className="loginBtn">Get Started</Link>
        )}
      </nav>

      <main>
        <section className="hero">
          <div className="heroGlow" aria-hidden="true" />
          <p className="eyebrow"><span className="eyebrowDot" /> Powered by Apertus AI</p>
          <h1>Turn your experience into your <em>next opportunity.</em></h1>
          <p className="heroText">Upload your CV in any language and get a sharper, ATS-friendly version in the same language.</p>
          <div className="heroActions">
            <Link to={session ? '/optimize' : '/auth'} className="startBtn">{session ? 'Open Dashboard' : 'Get Started'} <span>-&gt;</span></Link>
            <a href="#how-it-works" className="secondaryBtn">See how it works</a>
          </div>
          <div className="trustRow"><span>+ Any language</span><span>+ Private processing</span><span>+ Results in seconds</span></div>
        </section>

        <section className="features" id="features" aria-label="Features">
          {features.map(([icon, title, text]) => (
            <article className="card" key={title}>
              <div className={`cardIcon ${icon}`}>{icon === 'check' ? '+' : icon === 'arrow' ? '>' : '*'}</div>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="howItWorks" id="how-it-works">
          <p className="eyebrow">Simple by design</p>
          <h2>From draft to ready-to-send.</h2>
          <div className="steps">
            {steps.map(([number, title, text]) => (
              <div className="step" key={number}>
                <span>{number}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="pricing" id="pricing">
          <div className="pricingHeading">
            <p className="eyebrow">Choose your pace</p>
            <h2>Simple plans for your next move.</h2>
            <p>Start free and upgrade when your job search needs more momentum.</p>
          </div>
          <div className="pricingGrid">
            {plans.map((plan) => (
              <article className={`planCard ${plan.featured ? 'featuredPlan' : ''}`} key={plan.name}>
                {plan.featured && <span className="popularBadge">Most popular</span>}
                <span className="planLabel">{plan.name}</span>
                <h3>{plan.price}</h3>
                <p className="planDescription">{plan.text}</p>
                <ul>{plan.items.map((item) => <li key={item}>+ {item}</li>)}</ul>
                <Link to={`/auth?plan=${plan.name.toLowerCase().replace(' ', '-')}`} className={`planButton ${plan.featured ? '' : 'secondaryPlanButton'}`}>
                  Choose {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <div className="footerMain">
          <div><Link to="/" className="brand"><span className="brandMark">*</span> CV Optimizer AI</Link><p>Make your next application your strongest one.</p></div>
          <div className="footerLinks"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a><Link to={session ? '/optimize' : '/auth'}>{session ? 'Dashboard' : 'Get started'}</Link></div>
        </div>
        <div className="footerBottom"><span>Copyright 2026 CV Optimizer AI</span><span>Built with Apertus AI</span></div>
      </footer>
    </div>
  );
}
