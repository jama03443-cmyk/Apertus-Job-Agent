import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WorkspaceLayout from '../components/WorkspaceLayout';

type Plan = {
  name: string;
  price: string;
  description: string;
};

const plans: Plan[] = [
  { name: 'Starter', price: 'Free', description: 'For one resume.' },
  { name: 'Professional', price: '€9.99 / month', description: 'For an active job search.' },
  { name: 'Career Plus', price: '€19.99 / month', description: 'For a complete career move.' },
];

const PLAN_KEY = 'selectedPlan';

export default function Subscription() {
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(() => {
    const saved = localStorage.getItem(PLAN_KEY);
    return plans.find((plan) => plan.name === saved) || null;
  });
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/auth', { replace: true });
    });
  }, [navigate]);

  function openCheckout(plan: Plan) {
    if (plan.price === 'Free') {
      localStorage.setItem(PLAN_KEY, plan.name);
      setCurrentPlan(plan);
      navigate('/optimize');
      return;
    }
    setSelectedPlan(plan);
    setPaid(false);
    setPaymentMessage('');
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentMessage('');
    const digits = cardNumber.replace(/\s/g, '');
    if (digits !== '4242424242424242') {
      setPaymentMessage('For this demo, use Stripe test card 4242 4242 4242 4242.');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvc)) {
      setPaymentMessage('Enter a valid test expiry date and CVC.');
      return;
    }
    setProcessing(true);
    window.setTimeout(() => {
      setProcessing(false);
      setPaid(true);
      localStorage.setItem(PLAN_KEY, selectedPlan?.name || '');
      setCurrentPlan(selectedPlan);
    }, 700);
  }

  return (
    <WorkspaceLayout activePage="subscription">
      <section className="subscriptionPanel">
        <p className="eyebrow">Subscription</p>
        <h1>Choose a plan</h1>
        <p className="subscriptionIntro">Pick the option that fits your job search.</p>
        {currentPlan && <p className="currentPlanNote">Current plan: <strong>{currentPlan.name}</strong></p>}

        <div className="dashboardPlans">
          {plans.map((plan, index) => (
            <article className={`dashboardPlan ${index === 1 ? 'featuredPlan' : ''}`} key={plan.name}>
              {index === 1 && <span className="popularBadge">Popular</span>}
              <span className="planLabel">{plan.name}</span>
              <h2>{plan.price === 'Free' ? 'Free' : index === 1 ? 'Pro' : plan.price}</h2>
              <p>{plan.description}</p>
              <button className={`planButton ${index === 1 ? '' : 'secondaryPlanButton'}`} onClick={() => openCheckout(plan)}>
                Choose {index === 0 ? 'Starter' : index === 1 ? 'Pro' : 'Premium'}
              </button>
            </article>
          ))}
        </div>

        <p className="demoPaymentNote">Demo checkout only — no real payment is taken.</p>
      </section>

      {selectedPlan && (
        <div className="paymentOverlay" role="dialog" aria-modal="true" aria-labelledby="payment-title">
          <div className="paymentModal">
            {!paid ? (
              <>
                <div className="paymentHeader">
                  <div><p className="eyebrow">Secure checkout</p><h2 id="payment-title">Subscribe to {selectedPlan.name}</h2></div>
                  <button className="closePayment" onClick={() => setSelectedPlan(null)} aria-label="Close">×</button>
                </div>
                <p className="paymentAmount">{selectedPlan.price}</p>
                <form className="paymentForm" onSubmit={submitPayment}>
                  <label>Cardholder name<input required placeholder="Jama Doe" /></label>
                  <label>Card number<input required inputMode="numeric" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} /></label>
                  <div className="paymentRow"><label>Expiry<input required placeholder="MM/YY" value={expiry} onChange={(event) => setExpiry(event.target.value)} /></label><label>CVC<input required inputMode="numeric" placeholder="123" value={cvc} onChange={(event) => setCvc(event.target.value)} /></label></div>
                  {paymentMessage && <p className="paymentError" role="alert">{paymentMessage}</p>}
                  <button className="planButton paymentButton" disabled={processing}>{processing ? 'Processing...' : `Pay ${selectedPlan.price}`}</button>
                </form>
                <p className="testCardHint">Test card: 4242 4242 4242 4242 · any future date · 123</p>
              </>
            ) : (
              <div className="paymentSuccess"><span className="successIcon">✓</span><h2>Payment successful</h2><p>Your {selectedPlan.name} demo subscription is active.</p><button className="planButton" onClick={() => navigate('/optimize')}>Done</button></div>
            )}
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
