import { Link } from 'react-router-dom';
import { ImageTool } from '../components/ImageTool';
import { Seo } from '../components/Seo';
import { PAGE_SEO } from '../lib/seo';

export function CompressPng() {
  return (
    <>
      <Seo {...PAGE_SEO.png} />
      <ImageTool
        title="Compress PNG images"
        intro="Re-encode PNG files locally and keep transparency when the browser can. If the output is larger, convert to WebP rather than forcing another PNG pass."
        defaultFormat="png"
        lockFormat
        mode="compress"
      >
        <article className="max-w-3xl space-y-4 text-sm leading-7 text-muted">
          <h2 className="text-xl font-semibold text-ink">PNG size limits in the browser</h2>
          <p>
            PNG compression in a web app is constrained by what the browser encoder can do. It is lossless, which
            preserves sharp edges and transparency, but it will not always beat an already-optimised PNG. ImageShrink
            reports the real output size and warns you if the new file is larger.
          </p>
          <p>
            Converting a photograph from JPG to PNG almost always increases size because PNG stores every pixel
            without photographic compression. Use this tool for graphics that need a lossless file, then compare
            with <Link to="/image-to-webp">WebP</Link> if the download is still too heavy.
          </p>
          <p>
            You can also <Link to="/resize-image">resize</Link> a large PNG before sharing it. Smaller dimensions
            reduce bytes even when the encoder cannot squeeze the current canvas further.
          </p>
        </article>
      </ImageTool>
    </>
  );
}
