import { useEffect } from 'react';
import type { PageSeo } from '../lib/seo';

export function Seo({ title, description }: PageSeo) {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.append(meta);
    }
    meta.setAttribute('content', description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.append(canonical);
    }
    canonical.setAttribute('href', window.location.href.split('?')[0]);
  }, [title, description]);

  return null;
}
