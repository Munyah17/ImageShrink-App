import { Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { formatAuthError, useAuth } from '../lib/auth';
import { PLANS, type PlanId } from '../lib/plans';
import { useState } from 'react';

export function Pricing() {
  const { user, plan, startCheckout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<PlanId | null>(null);

  async function choose(id: PlanId) {
    setError(null);
    if (id === 'free') {
      navigate('/signup');
      return;
    }
    if (!user) {
      navigate('/login');
      return;
    }
    setBusy(id);
    try {
      await startCheckout(id);
    } catch (caught) {
      setError(formatAuthError(caught));
      setBusy(null);
    }
  }

  return (
    <>
      <Seo
        title="Pricing — ImageShrink"
        description="Free ImageShrink with generous daily limits, or cheap Plus and Pro plans to remove ads and raise AI allowances."
      />
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold">Simple, cheap plans</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Compression always runs on your device. You pay only if you want more AI drafts and an ad-free workspace.
        </p>
        {error && (
          <p className="mt-4 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {(Object.keys(PLANS) as PlanId[]).map((id) => {
            const item = PLANS[id];
            const current = plan.id === id;
            return (
              <article key={id} className={`rounded-2xl border p-5 ${current ? 'border-accent bg-accent-soft/30' : 'border-line bg-panel'}`}>
                <p className="text-sm text-muted">{item.name}</p>
                <p className="mt-1 text-3xl font-semibold">{item.priceLabel}</p>
                <p className="mt-2 text-sm text-muted">{item.blurb}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check size={16} className="mt-0.5 text-accent" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={current || busy === id}
                  onClick={() => void choose(id)}
                  className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    id === 'free' ? 'border border-line' : 'optimize-btn'
                  } disabled:opacity-50`}
                >
                  {current ? 'Current plan' : busy === id ? 'Redirecting…' : id === 'free' ? 'Start free' : `Upgrade to ${item.name}`}
                </button>
              </article>
            );
          })}
        </div>
        {!user && (
          <p className="mt-6 text-sm text-muted">
            <Link to="/login">Log in</Link> before upgrading so Stripe can attach the subscription to your account.
          </p>
        )}
      </div>
    </>
  );
}
