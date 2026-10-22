import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { formatAuthError, useAuth } from '../lib/auth';

export function Signup() {
  const { signup, health } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(email, password);
      navigate('/account');
    } catch (caught) {
      setError(formatAuthError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo
        title="Sign up — ImageShrink"
        description="Create a free ImageShrink account. Generous daily compression and AI drafts, with cheap Plus and Pro plans if you want no ads."
      />
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold">Create a free account</h1>
        <p className="mt-2 text-sm text-muted">
          500 compressions and 50 AI drafts per day on the free plan. Images still process in your browser.
        </p>
        {health && !health.accountsConfigured && (
          <p className="mt-4 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
            Accounts are not configured on this API yet. Bind D1, then sign up.
          </p>
        )}
        <form className="mt-6 space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Password (8+ characters)
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
            />
          </label>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="optimize-btn w-full rounded-xl px-4 py-3 text-sm font-semibold">
            {busy ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </>
  );
}
