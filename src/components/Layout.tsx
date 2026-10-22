import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdSlot } from './AdSlot';
import { Footer } from './Footer';
import { Header } from './Header';

const TOOL_PATHS = new Set(['/', '/compress-jpg', '/compress-png', '/image-to-webp', '/resize-image']);

export function Layout() {
  const location = useLocation();
  const showAds = TOOL_PATHS.has(location.pathname);
  const client = import.meta.env.VITE_ADSENSE_CLIENT;

  useEffect(() => {
    if (!client) return;
    const id = 'imageshrink-adsense';
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.crossOrigin = 'anonymous';
    document.head.append(script);
  }, [client]);

  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-line bg-card/90 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <Header />
        {showAds && (
          <div className="px-4 pt-4 sm:px-8">
            <AdSlot placement="top" />
          </div>
        )}
        <main className="px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
        {showAds && (
          <div className="px-4 pb-4 sm:px-8">
            <AdSlot placement="footer" />
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
