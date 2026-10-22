export type PageSeo = {
  title: string;
  description: string;
};

export const PAGE_SEO = {
  home: {
    title: 'ImageShrink — Compress and convert images in your browser',
    description:
      'Reduce JPG, PNG and WebP file sizes locally in your browser. Convert formats, resize images and download the results without uploading files to a server.',
  },
  jpg: {
    title: 'Compress JPG online — ImageShrink',
    description:
      'Compress JPG photos in your browser with adjustable quality. Keep the original file, compare sizes and download smaller JPEGs without sending images to a server.',
  },
  png: {
    title: 'Compress PNG online — ImageShrink',
    description:
      'Re-encode PNG images in your browser. Preserve transparency where possible, compare file sizes and convert to WebP when a PNG cannot be reduced.',
  },
  webp: {
    title: 'Convert images to WebP — ImageShrink',
    description:
      'Convert JPG and PNG files to WebP in your browser. Preview the result, keep transparency when supported and download WebP files locally.',
  },
  resize: {
    title: 'Resize images online — ImageShrink',
    description:
      'Resize images to exact pixel dimensions in your browser. Lock aspect ratio, preview the output and download the resized file without uploading it.',
  },
} as const satisfies Record<string, PageSeo>;
