import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { useAuth } from '../lib/auth';

function Bar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted">
          {used} / {limit.toLocaleString()} today
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Account() {
  const { user, plan, usage, loading, logout } = useAuth();
  const [params] = useSearchParams();
  const upgraded = params.get('upgraded') === '1';

  if (loading) {
    return <p className="text-sm text-muted">Loading account…</p>;
  }

  if (!user) {
    return (
      <>
        <Seo title="Account — ImageShrink" description="Manage your ImageShrink plan and daily usage." />
        <div className="max-w-lg">
          <h1 className="text-3xl font-semibold">Account</h1>
          <p className="mt-3 text-sm text-muted">You are using ImageShrink as a guest. Sign up to keep a plan across devices.</p>
          <div className="mt-6 flex gap-3">
            <Link className="optimize-btn rounded-xl px-4 py-2 text-sm font-semibold no-underline" to="/signup">
              Sign up
            </Link>
            <Link className="rounded-xl border border-line px-4 py-2 text-sm no-underline" to="/login">
              Log in
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Account — ImageShrink" description="Your ImageShrink plan, usage, and billing shortcuts." />
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-3xl font-semibold">Account</h1>
        {upgraded && (
          <p className="rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
            Checkout completed. If your plan has not updated yet, refresh in a few seconds after the Stripe webhook.
          </p>
        )}
        <section className="rounded-2xl border border-line bg-panel p-5">
          <p className="text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-lg font-semibold">
            {plan.name} · {plan.priceLabel}
          </p>
          <p className="mt-2 text-sm text-muted">{plan.blurb}</p>
          <Link className="mt-4 inline-block text-sm" to="/pricing">
            Change plan
          </Link>
        </section>
        {usage && (
          <section className="space-y-4 rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-semibold">Today’s usage (UTC)</h2>
            <Bar used={usage.compress.used} limit={usage.compress.limit} label="Compressions" />
            <Bar used={usage.ai.used} limit={usage.ai.limit} label="AI drafts" />
            <p className="text-xs text-muted">
              Compression still runs in your browser if the counter is unreachable. AI limits are enforced on the Worker.
            </p>
          </section>
        )}
        <button type="button" onClick={() => void logout()} className="rounded-xl border border-line px-4 py-2 text-sm">
          Log out
        </button>
      </div>
    </>
  );
}
