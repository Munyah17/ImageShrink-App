import { Link } from 'react-router-dom';
import { ImageTool } from '../components/ImageTool';
import { Seo } from '../components/Seo';
import { PAGE_SEO } from '../lib/seo';

export function ImageToWebp() {
  return (
    <>
      <Seo {...PAGE_SEO.webp} />
      <ImageTool
        title="Convert images to WebP"
        intro="Turn JPG and PNG files into WebP in your browser. WebP often produces smaller photos than JPG at a similar visual quality and can keep transparency."
        defaultFormat="webp"
        lockFormat
        mode="convert"
      >
        <article className="max-w-3xl space-y-4 text-sm leading-7 text-muted">
          <h2 className="text-xl font-semibold text-ink">Why convert to WebP</h2>
          <p>
            WebP is widely supported in current browsers and is a practical default for websites. Lossy WebP is
            useful for photographs. Lossless-looking graphics with transparency can stay as PNG, or use WebP when
            your browser encodes an alpha channel correctly.
          </p>
          <p>
            ImageShrink checks the encoded MIME type after conversion. If your browser cannot produce WebP, you
            will see an error instead of a mislabelled JPG. You can then fall back to{' '}
            <Link to="/compress-jpg">JPG</Link> or <Link to="/compress-png">PNG</Link>.
          </p>
          <p>
            Combine conversion with <Link to="/resize-image">resizing</Link> when you need both a modern format and
            specific pixel dimensions for a layout.
          </p>
        </article>
      </ImageTool>
    </>
  );
}
