import { supportsLossyQuality } from '../lib/image/formats';
import type { OutputFormat } from '../lib/image/types';

type Props = {
  outputFormat: OutputFormat;
  onOutputFormatChange?: (format: OutputFormat) => void;
  allowFormatChange: boolean;
  quality: number;
  onQualityChange: (value: number) => void;
  width: string;
  height: string;
  onWidthChange: (value: string) => void;
  onHeightChange: (value: string) => void;
  lockAspect: boolean;
  onLockAspectChange: (value: boolean) => void;
  showResize: boolean;
  flattenColor: string;
  onFlattenColorChange: (value: string) => void;
};

export function ToolControls({
  outputFormat,
  onOutputFormatChange,
  allowFormatChange,
  quality,
  onQualityChange,
  width,
  height,
  onWidthChange,
  onHeightChange,
  lockAspect,
  onLockAspectChange,
  showResize,
  flattenColor,
  onFlattenColorChange,
}: Props) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold">Output settings</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Format
          <select
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
            value={outputFormat}
            disabled={!allowFormatChange}
            onChange={(event) => onOutputFormatChange?.(event.target.value as OutputFormat)}
          >
            <option value="jpeg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </label>
        {supportsLossyQuality(outputFormat) ? (
          <label className="flex flex-col gap-1 text-sm">
            Quality ({Math.round(quality * 100)}%)
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(quality * 100)}
              onChange={(event) => onQualityChange(Number(event.target.value) / 100)}
            />
          </label>
        ) : (
          <p className="self-end text-sm text-stone-600">
            PNG is lossless in the browser. Quality does not apply.
          </p>
        )}
        {outputFormat === 'jpeg' && (
          <label className="flex flex-col gap-1 text-sm">
            JPG background for transparent pixels
            <input
              type="color"
              value={flattenColor}
              onChange={(event) => onFlattenColorChange(event.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-stone-300"
            />
          </label>
        )}
      </div>
      {showResize && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Width (px)
            <input
              inputMode="numeric"
              className="rounded-lg border border-stone-300 px-3 py-2"
              value={width}
              onChange={(event) => onWidthChange(event.target.value)}
              placeholder="Original"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Height (px)
            <input
              inputMode="numeric"
              className="rounded-lg border border-stone-300 px-3 py-2"
              value={height}
              onChange={(event) => onHeightChange(event.target.value)}
              placeholder="Original"
            />
          </label>
          <label className="flex items-end gap-2 text-sm">
            <input
              type="checkbox"
              checked={lockAspect}
              onChange={(event) => onLockAspectChange(event.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
            Lock aspect ratio
          </label>
        </div>
      )}
    </section>
  );
}
