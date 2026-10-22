import { Copy, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { downscaleForAi, generateSeoCopy } from '../lib/ai/client';
import type { AiSeoResult } from '../lib/ai/types';
import { ConsentNote } from './ConsentNote';

type Props = {
  file?: File;
};

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function AiSeoPanel({ file }: Props) {
  const { health, plan, refresh, loading } = useAuth();
  const consentId = useId();
  const [consent, setConsent] = useState(false);
  const [productDetails, setProductDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiSeoResult | null>(null);
  const [remaining, setRemaining] = useState<number | undefined>();
  const [copied, setCopied] = useState<string | null>(null);

  async function onGenerate() {
    if (!file) {
      setError('Upload an image above first.');
      return;
    }
    if (!consent) {
      setError('Tick the consent box so we can send a downscaled JPEG to Groq.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const imageDataUrl = await downscaleForAi(file);
      const response = await generateSeoCopy({
        imageDataUrl,
        mimeType: 'image/jpeg',
        consent,
        productDetails: productDetails.trim() || undefined,
      });
      if (!response.ok) {
        setResult(null);
        setError(response.error);
      } else {
        setResult(response.data);
      }
      setRemaining(response.remaining);
      void refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not prepare the image.');
    } finally {
      setBusy(false);
    }
  }

  async function onCopy(label: string, value: string) {
    await copyText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles size={18} className="text-accent" aria-hidden="true" />
        AI Image SEO Generator
      </h2>
      <p className="mt-2 text-sm text-muted">
        Sends a downscaled JPEG to Groq after you consent, then returns alt text, a filename, a title and a caption
        you can copy. These are drafts. Compression stays in your browser.
      </p>
      {!loading && health === null && (
        <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          AI API is offline. Run <code>npm run worker:dev</code> alongside the Vite app, then try again.
        </p>
      )}
      {health && !health.aiConfigured && (
        <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          Groq is not configured on the Worker. Add GROQ_API_KEY to <code>.dev.vars</code>.
        </p>
      )}
      <label className="mt-4 block text-sm font-medium">
        Product details (optional)
        <textarea
          value={productDetails}
          onChange={(event) => setProductDetails(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Brand, material, intended use, target audience…"
          className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        />
      </label>
      <div className="mt-4">
        <ConsentNote id={consentId} checked={consent} onChange={setConsent} sendsImage />
      </div>
      <button
        type="button"
        onClick={() => void onGenerate()}
        disabled={busy || !file || !consent}
        className="optimize-btn mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed"
      >
        {busy ? 'Generating…' : !file ? 'Upload an image first' : 'Generate SEO text'}
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
        <dl className="mt-4 space-y-3 text-sm">
          {(
            [
              ['Alt text', result.altText],
              ['Filename', result.fileName],
              ['Title', result.title],
              ['Caption', result.caption],
              ...(result.productListing ? [['Product listing', result.productListing] as const] : []),
            ] as Array<[string, string]>
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="flex items-center justify-between font-medium">
                {label}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-normal text-muted hover:text-ink"
                  onClick={() => void onCopy(label, value)}
                >
                  <Copy size={12} aria-hidden="true" />
                  {copied === label ? 'Copied' : 'Copy'}
                </button>
              </dt>
              <dd className="text-muted">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
