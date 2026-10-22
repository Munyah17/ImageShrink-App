import {
  Cpu,
  Download,
  Files,
  Lock,
  RefreshCw,
  Shield,
  Sparkles,
  Unlock,
  Zap,
} from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useImageQueue } from '../hooks/useImageQueue';
import { formatBytes, percentSaved, supportsLossyQuality } from '../lib/image/formats';
import type { AiAdvisorResult } from '../lib/ai/types';
import type { OutputFormat, ProcessOptions } from '../lib/image/types';
import { AdSlot } from './AdSlot';
import { AiAdvisorPanel } from './AiAdvisorPanel';
import { AiSeoPanel } from './AiSeoPanel';
import { ComparisonSlider } from './ComparisonSlider';
import { ResultCard } from './ResultCard';
import { UploadDropzone } from './UploadDropzone';

type ToolMode = 'compress' | 'convert' | 'resize';

type Props = {
  title: string;
  intro: string;
  defaultFormat: OutputFormat;
  lockFormat?: boolean;
  mode: ToolMode;
  children?: ReactNode;
};

const FEATURES = [
  { icon: Cpu, title: 'Smart Compression', copy: 'Local canvas encoding tuned for photos and graphics.' },
  { icon: Files, title: 'Multiple Formats', copy: 'JPG, PNG and WebP, with real MIME checks.' },
  { icon: Shield, title: 'Secure & Private', copy: 'Images stay in your browser unless you consent to AI.' },
  { icon: Zap, title: 'Fast & Efficient', copy: 'Background workers keep the interface responsive.' },
  { icon: Sparkles, title: 'Quality you control', copy: 'Pick the smallest size that still looks right.' },
];

export function ImageTool({ title, intro, defaultFormat, lockFormat, mode, children }: Props) {
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(defaultFormat);
  const [quality, setQuality] = useState(0.75);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [lockAspect, setLockAspect] = useState(true);
  const [flattenColor, setFlattenColor] = useState('#ffffff');

  const getOptions = useCallback((): ProcessOptions => {
    return {
      outputFormat,
      quality,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      lockAspect,
      flattenColor,
    };
  }, [flattenColor, height, lockAspect, outputFormat, quality, width]);

  const queue = useImageQueue(getOptions);
  const firstFile = queue.items[0]?.file;
  const active = queue.items[0];
  const firstDone = queue.items.find((item) => item.status === 'done' && item.result);
  const processedSize = active?.result?.blob.size;
  const saved = processedSize !== undefined && active ? percentSaved(active.originalSize, processedSize) : null;

  const dimensionError = useMemo(() => {
    if (width && (!Number.isFinite(Number(width)) || Number(width) < 1)) return 'Width must be a positive number.';
    if (height && (!Number.isFinite(Number(height)) || Number(height) < 1)) return 'Height must be a positive number.';
    if (width && Number(width) > 8192) return 'Width cannot exceed 8192 pixels.';
    if (height && Number(height) > 8192) return 'Height cannot exceed 8192 pixels.';
    if (mode === 'resize' && !width && !height) return 'Enter a target width, height, or both before resizing.';
    return null;
  }, [height, mode, width]);

  function applyAdvice(advice: AiAdvisorResult) {
    if (!lockFormat) setOutputFormat(advice.recommendedFormat);
    if (advice.recommendedQuality !== undefined) setQuality(advice.recommendedQuality);
    if (advice.recommendedWidth) setWidth(String(advice.recommendedWidth));
    if (advice.recommendedHeight) setHeight(String(advice.recommendedHeight));
  }

  const fieldClass = 'mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm';

  return (
    <div className="space-y-8">
      <h1 className="sr-only">{title}</h1>
      <p className="sr-only">{intro}</p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.92fr)]">
        <div className="space-y-4">
          {!active && <UploadDropzone disabled={queue.isProcessing} onFiles={queue.addFiles} />}
          {active && (
            <>
              <UploadDropzone compact disabled={queue.isProcessing} onFiles={queue.addFiles} />
              <ComparisonSlider
                beforeUrl={active.originalUrl}
                afterUrl={active.resultUrl}
                alt={active.file.name}
                processing={active.status === 'processing' || queue.isProcessing}
              />
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-line bg-panel px-4 py-4 text-center">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Original Size</p>
                  <p className="mt-1 text-lg font-semibold">{formatBytes(active.originalSize)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Compressed Size</p>
                  <p className="mt-1 text-lg font-semibold">
                    {processedSize !== undefined ? formatBytes(processedSize) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Reduction</p>
                  <p className={`mt-1 text-lg font-semibold ${saved !== null && saved > 0 ? 'text-accent' : ''}`}>
                    {saved === null ? '—' : saved > 0 ? `${saved}%` : `${saved}%`}
                  </p>
                </div>
              </div>
            </>
          )}
          {queue.uploadError && (
            <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
              {queue.uploadError}
            </p>
          )}
          {queue.items.length > 1 && (
            <div className="space-y-2">
              {queue.items.slice(1).map((item) => (
                <ResultCard key={item.id} item={item} onDownload={queue.downloadOne} onRemove={queue.removeItem} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-2xl border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold">Compression Settings</h2>
          {supportsLossyQuality(outputFormat) ? (
            <label className="block text-sm font-medium">
              <span className="flex items-center justify-between">
                Intelligent compression level
                <span className="text-accent">{Math.round(quality * 100)}%</span>
              </span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
                className="accent-bar mt-4 w-full"
              />
            </label>
          ) : (
            <p className="text-sm text-muted">
              PNG is encoded losslessly. If the file does not shrink, convert to WebP instead.
            </p>
          )}

          <label className="block text-sm font-medium">
            Output format
            <select
              className={fieldClass}
              value={outputFormat}
              disabled={lockFormat}
              onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
            >
              <option value="jpeg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </label>

          {(mode === 'resize' || mode === 'compress') && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">
                Width
                <input inputMode="numeric" className={fieldClass} placeholder="Auto" value={width} onChange={(event) => setWidth(event.target.value)} />
              </label>
              <label className="block text-sm font-medium">
                Height
                <input inputMode="numeric" className={fieldClass} placeholder="Auto" value={height} onChange={(event) => setHeight(event.target.value)} />
              </label>
              <button
                type="button"
                onClick={() => setLockAspect((value) => !value)}
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"
              >
                {lockAspect ? <Lock size={16} aria-hidden="true" /> : <Unlock size={16} aria-hidden="true" />}
                {lockAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
              </button>
            </div>
          )}

          {outputFormat === 'jpeg' && (
            <label className="block text-sm font-medium">
              JPG background
              <input type="color" value={flattenColor} onChange={(event) => setFlattenColor(event.target.value)} className="mt-2 h-10 w-16 cursor-pointer rounded border border-line" />
              <span className="mt-2 block text-xs font-normal text-muted">
                JPG does not support transparency. Transparent pixels are filled with this colour.
              </span>
            </label>
          )}

          {dimensionError && (
            <p className="text-sm text-danger" role="alert">
              {dimensionError}
            </p>
          )}

          <AdSlot placement="side" />

          <button
            type="button"
            disabled={queue.items.length === 0 || queue.isProcessing || Boolean(dimensionError)}
            onClick={() => void queue.processAll(true)}
            className="optimize-btn inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
          >
            <Zap size={16} aria-hidden="true" />
            {queue.isProcessing ? 'Optimizing…' : 'Optimize Image'}
          </button>

          <ul className="space-y-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-3 rounded-xl border border-line bg-card/70 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <feature.icon size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{feature.title}</span>
                  <span className="block text-xs text-muted">{feature.copy}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!active?.result}
              onClick={() => active?.result && queue.downloadOne(active.id)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-3 py-3 text-sm font-medium disabled:opacity-40"
            >
              <Download size={16} aria-hidden="true" />
              Download
            </button>
            <button
              type="button"
              disabled={queue.stats.done < 1}
              onClick={() => void (queue.stats.done > 1 ? queue.downloadZip() : firstDone && queue.downloadOne(firstDone.id))}
              className="optimize-btn inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              <Download size={16} aria-hidden="true" />
              Download All
            </button>
          </div>
          {queue.items.length > 0 && (
            <button type="button" onClick={queue.clearAll} className="inline-flex w-full items-center justify-center gap-2 text-sm text-muted hover:text-ink">
              <RefreshCw size={14} aria-hidden="true" />
              Start over
            </button>
          )}
        </aside>
      </div>

      <AdSlot placement="feed" />

      <div className="grid gap-6 lg:grid-cols-2">
        <AiSeoPanel file={firstFile} />
        <AiAdvisorPanel
          sourceFormat={firstFile?.type}
          originalBytes={firstFile?.size}
          width={firstDone?.result?.originalWidth}
          height={firstDone?.result?.originalHeight}
          formatLocked={lockFormat}
          onApply={applyAdvice}
        />
      </div>

      {children}
    </div>
  );
}
