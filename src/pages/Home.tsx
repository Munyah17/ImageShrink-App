import { ImageTool } from '../components/ImageTool';
import { Seo } from '../components/Seo';
import { PAGE_SEO } from '../lib/seo';

export function Home() {
  return (
    <>
      <Seo {...PAGE_SEO.home} />
      <ImageTool
        title="Compress images in your browser"
        intro="Reduce file size, convert formats and resize photos locally. Nothing is uploaded to ImageShrink — processing uses your device."
        defaultFormat="webp"
        mode="compress"
      />
    </>
  );
}
