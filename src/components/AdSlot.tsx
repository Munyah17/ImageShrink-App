import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Placement = 'top' | 'feed' | 'side' | 'footer';

type Props = {
  placement: Placement;
};

const SLOT_ENV: Record<Placement, string | undefined> = {
  top: import.meta.env.VITE_ADSENSE_SLOT_TOP,
  feed: import.meta.env.VITE_ADSENSE_SLOT_FEED,
  side: import.meta.env.VITE_ADSENSE_SLOT_SIDE,
  footer: import.meta.env.VITE_ADSENSE_SLOT_FOOTER,
};

const HEIGHT: Record<Placement, string> = {
  top: 'min-h-[90px]',
  feed: 'min-h-[250px]',
  side: 'min-h-[250px]',
  footer: 'min-h-[90px]',
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({ placement }: Props) {
  const { plan } = useAuth();
  const pushed = useRef(false);
  const client = import.meta.env.VITE_ADSENSE_CLIENT;
  const slot = SLOT_ENV[placement];

  useEffect(() => {
    if (!plan.ads || !client || !slot || pushed.current) return;
    pushed.current = true;
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch {
      pushed.current = false;
    }
  }, [client, plan.ads, slot]);

  if (!plan.ads) return null;

  return (
    <aside
      className={`overflow-hidden rounded-2xl border border-line bg-panel ${HEIGHT[placement]}`}
      aria-label="Advertisement"
    >
      <p className="px-3 pt-2 text-[10px] uppercase tracking-[0.16em] text-muted">Advertisement</p>
      {client && slot ? (
        <ins
          className="adsbygoogle block"
          style={{ display: 'block', minHeight: placement === 'feed' || placement === 'side' ? 250 : 90 }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={placement === 'top' || placement === 'footer' ? 'horizontal' : 'rectangle'}
          data-full-width-responsive="true"
        />
      ) : (
        <Link
          to="/pricing"
          className="flex h-full min-h-[72px] flex-col items-center justify-center px-4 py-6 text-center no-underline"
        >
          <span className="text-sm font-semibold text-ink">ImageShrink Plus — $2.99/mo</span>
          <span className="mt-1 text-xs text-muted">Remove ads and raise your AI allowance. Compression stays local.</span>
        </Link>
      )}
    </aside>
  );
}
