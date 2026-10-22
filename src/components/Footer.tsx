import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-line px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div>
          <p className="font-semibold">ImageShrink</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Compression, conversion and resizing run locally. Files are not uploaded to ImageShrink.
            Optional AI drafts use Groq only after you consent.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
          <Link className="text-muted no-underline hover:text-ink" to="/compress-jpg">
            Compress JPG
          </Link>
          <Link className="text-muted no-underline hover:text-ink" to="/compress-png">
            Compress PNG
          </Link>
          <Link className="text-muted no-underline hover:text-ink" to="/image-to-webp">
            Convert to WebP
          </Link>
          <Link className="text-muted no-underline hover:text-ink" to="/resize-image">
            Resize image
          </Link>
          <Link className="text-muted no-underline hover:text-ink" to="/pricing">
            Pricing
          </Link>
          <Link className="text-muted no-underline hover:text-ink" to="/account">
            Account
          </Link>
        </div>
      </div>
    </footer>
  );
}
