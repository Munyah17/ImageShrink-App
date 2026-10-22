import { Link } from 'react-router-dom';
import { ImageTool } from '../components/ImageTool';
import { Seo } from '../components/Seo';
import { PAGE_SEO } from '../lib/seo';

export function ResizeImage() {
  return (
    <>
      <Seo {...PAGE_SEO.resize} />
      <ImageTool
        title="Resize images"
        intro="Set a target width and height in pixels, lock the aspect ratio, then preview the result before you download. Oversized requests are clamped so the tab does not run out of memory."
        defaultFormat="jpeg"
        mode="resize"
      >
        <article className="max-w-3xl space-y-4 text-sm leading-7 text-muted">
          <h2 className="text-xl font-semibold text-ink">Choosing dimensions</h2>
          <p>
            Enter only a width or only a height with the aspect lock on to scale proportionally. Unlock the ratio
            if you need a specific box and accept stretching. ImageShrink caps a single edge at 8192 pixels and
            limits total pixels to keep large photographs workable in the browser.
          </p>
          <p>
            Resizing does not replace compression. A 4000-pixel photo saved as PNG can still be huge. After you
            like the preview, pick JPG or WebP in the format menu, or open{' '}
            <Link to="/compress-jpg">JPG compression</Link> / <Link to="/image-to-webp">WebP conversion</Link> for
            format-focused guidance.
          </p>
        </article>
      </ImageTool>
    </>
  );
}
