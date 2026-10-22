import { SlidersHorizontal } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateAdvice } from '../lib/ai/client';
import { useAuth } from '../lib/auth';
import type { AiAdvisorResult } from '../lib/ai/types';
import { ConsentNote } from './ConsentNote';

type Props = {
  sourceFormat?: string;
  originalBytes?: number;
  width?: number;
  height?: number;
  formatLocked?: boolean;
  onApply?: (result: AiAdvisorResult) => void;
};

export function AiAdvisorPanel({
  sourceFormat,
  originalBytes,
  width,
  height,
  formatLocked,
  onApply,
}: Props) {
  const { health, plan, refresh, loading } = useAuth();
  const consentId = useId();
  const [consent, setConsent] = useState(false);
  const [intendedUse, setIntendedUse] = useState('website hero image');
  const [targetKb, setTargetKb] = useState('200');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAdvisorResult | null>(null);
  const [remaining, setRemaining] = useState<number | undefined>();

  async function onAdvise() {
    if (!consent) {
      setError('Tick the consent box to send this request to Groq. No image file is attached.');
      return;
    }
    if (!intendedUse.trim()) {
      setError('Describe the intended use.');
      return;
    }
    setBusy(true);
    setError(null);
    const kb = Number(targetKb);
    const response = await generateAdvice({
      intendedUse: intendedUse.trim(),
      targetBytes: Number.isFinite(kb) ? Math.round(kb * 1024) : undefined,
      width,
      height,
      sourceFormat,
      originalBytes,
      consent,
    });
    setBusy(false);
    setRemaining(response.remaining);
    void refresh();
    if (!response.ok) {
      setResult(null);
      setError(response.error);
      return;
    }
    setResult(response.data);
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <SlidersHorizontal size={18} className="text-accent" aria-hidden="true" />
        AI Compression Advisor
      </h2>
      <p className="mt-2 text-sm text-muted">
        Groq recommends format, size and quality from your intended use. Click apply, then Optimize Image to measure
        the real file size in this browser.
      </p>
      {!loading && health === null && (
        <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          AI API is offline. Run <code>npm run worker:dev</code> in another terminal.
        </p>
      )}
      <label className="mt-4 block text-sm font-medium">
        Intended use
        <input
          value={intendedUse}
          onChange={(event) => setIntendedUse(event.target.value)}
          maxLength={200}
          className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Target size (KB)
        <input
          inputMode="numeric"
          value={targetKb}
          onChange={(event) => setTargetKb(event.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        />
      </label>
      <div className="mt-4">
        <ConsentNote id={consentId} checked={consent} onChange={setConsent} />
      </div>
      <button
        type="button"
        onClick={() => void onAdvise()}
        disabled={busy || !consent}
        className="optimize-btn mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed"
      >
        {busy ? 'Asking Groq…' : 'Get recommendation'}
      </button>
      {remaining !== undefined && (
        <p className="mt-2 text-xs text-muted">
          {remaining} AI requests left on {plan.name} today.{' '}
          {plan.ads && (
            <Link to="/pricing" className="text-accent">
              Upgrade
            </Link>
          )}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-medium">Suggested format:</span> {result.recommendedFormat.toUpperCase()}
          </p>
          {(result.recommendedWidth || result.recommendedHeight) && (
            <p>
              <span className="font-medium">Suggested size:</span> {result.recommendedWidth ?? '—'} ×{' '}
              {result.recommendedHeight ?? '—'} px
            </p>
          )}
          {result.recommendedQuality !== undefined && (
            <p>
              <span className="font-medium">Suggested quality:</span>{' '}
              {Math.round(result.recommendedQuality * 100)}%
            </p>
          )}
          <p className="text-muted">{result.rationale}</p>
          {result.caveats.length > 0 && (
            <ul className="list-disc pl-5 text-muted">
              {result.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          )}
          {onApply && (
            <button
              type="button"
              onClick={() => onApply(result)}
              className="optimize-btn rounded-xl px-3 py-2 text-sm font-semibold"
            >
              Apply as starting settings
            </button>
          )}
          {formatLocked && (
            <p className="text-xs text-muted">
              This page locks the output format. Applied recommendations change quality and size only.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
