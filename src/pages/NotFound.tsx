import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';

export function NotFound() {
  return (
    <>
      <Seo title="Page not found — ImageShrink" description="This ImageShrink page does not exist." />
      <div className="max-w-lg">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-muted">The page you requested is not part of ImageShrink.</p>
        <Link className="mt-6 inline-block font-medium text-accent-dark" to="/">
          Back to the compressor
        </Link>
      </div>
    </>
  );
}
