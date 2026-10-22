import { AlertTriangle, Download, Trash2 } from 'lucide-react';
import { formatBytes, formatLabel, percentSaved } from '../lib/image/formats';
import type { ImageQueueItem } from '../lib/image/types';

type Props = {
  item: ImageQueueItem;
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
};

export function ResultCard({ item, onDownload, onRemove }: Props) {
  const processedSize = item.result?.blob.size;
  const saved = processedSize !== undefined ? percentSaved(item.originalSize, processedSize) : null;
  const larger = processedSize !== undefined && processedSize > item.originalSize;

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center gap-3 p-3">
        <img
          src={item.resultUrl ?? item.originalUrl}
          alt={`Preview of ${item.file.name}`}
          className="h-14 w-14 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{item.file.name}</h3>
          <p className="text-xs text-muted">
            {item.status === 'processing' && 'Optimizing…'}
            {item.status === 'pending' && 'Queued'}
            {item.status === 'error' && item.error}
            {item.status === 'done' && item.result && (
              <>
                {formatBytes(item.originalSize)} → {formatBytes(item.result.blob.size)} ·{' '}
                {formatLabel(item.result.outputFormat)}
                {saved !== null && !larger ? ` · ${saved}% smaller` : ''}
                {larger ? ` · ${Math.abs(saved ?? 0)}% larger` : ''}
              </>
            )}
          </p>
        </div>
        {item.status === 'done' && item.result && (
          <button
            type="button"
            onClick={() => onDownload(item.id)}
            className="rounded-lg border border-line p-2 text-muted hover:text-ink"
            aria-label={`Download ${item.file.name}`}
          >
            <Download size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="rounded-lg border border-line p-2 text-muted hover:text-danger"
          aria-label={`Remove ${item.file.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
      {item.result?.warnings.map((warning) => (
        <p key={warning.code} className="flex items-start gap-2 border-t border-line px-3 py-2 text-xs text-warn">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{warning.message}</span>
        </p>
      ))}
    </article>
  );
}
