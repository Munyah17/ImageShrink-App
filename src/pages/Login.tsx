import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { formatAuthError, useAuth } from '../lib/auth';

export function Login() {
  const { login, health } = useAuth();
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
      await login(email, password);
      navigate('/account');
    } catch (caught) {
      setError(formatAuthError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Log in — ImageShrink" description="Log in to ImageShrink to track usage, hide ads, and unlock cheap Plus or Pro plans." />
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold">Log in</h1>
        <p className="mt-2 text-sm text-muted">Compression still works without an account. Sign in to save your plan.</p>
        {health && !health.accountsConfigured && (
          <p className="mt-4 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
            Accounts are not configured on this API yet. You can still compress images locally.
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
            Password
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
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          No account? <Link to="/signup">Sign up free</Link>
        </p>
      </div>
    </>
  );
}
