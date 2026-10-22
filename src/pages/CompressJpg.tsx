import { Link } from 'react-router-dom';
import { ImageTool } from '../components/ImageTool';
import { Seo } from '../components/Seo';
import { PAGE_SEO } from '../lib/seo';

export function CompressJpg() {
  return (
    <>
      <Seo {...PAGE_SEO.jpg} />
      <ImageTool
        title="Compress JPG images"
        intro="Lower JPEG quality to reduce photo size for email, blogs and product pages. The original file stays on your device until you download a new copy."
        defaultFormat="jpeg"
        lockFormat
        mode="compress"
      >
        <article className="max-w-3xl space-y-4 text-sm leading-7 text-muted">
          <h2 className="text-xl font-semibold text-ink">When JPG compression helps</h2>
          <p>
            JPG is a lossy format. Each re-encode discards some detail. For photographs, a quality around 70–85%
            often looks close to the original while cutting a large share of the bytes. Screenshots, logos and
            graphics with sharp edges usually look better as PNG or WebP.
          </p>
          <p>
            JPG cannot store transparency. If you upload a PNG with a transparent background, ImageShrink fills
            those pixels with a solid colour before encoding. Keep a PNG or WebP if you need an alpha channel.
          </p>
          <p>
            Need a more modern lossy format? Try <Link to="/image-to-webp">converting to WebP</Link>. For icons
            and UI assets, use <Link to="/compress-png">PNG</Link> instead.
          </p>
        </article>
      </ImageTool>
    </>
  );
}
