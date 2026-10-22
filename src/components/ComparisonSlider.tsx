import { useRef, useState, type PointerEvent } from 'react';

type Props = {
  beforeUrl: string;
  afterUrl?: string;
  alt: string;
  processing?: boolean;
};

export function ComparisonSlider({ beforeUrl, afterUrl, alt, processing }: Props) {
  const [position, setPosition] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);

  function move(event: PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const next = ((event.clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(96, Math.max(4, next)));
  }

  return (
    <div
      ref={frameRef}
      className="relative overflow-hidden rounded-2xl border border-line bg-paper"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event);
      }}
    >
      <img
        src={afterUrl ?? beforeUrl}
        alt={afterUrl ? `Processed ${alt}` : `Original ${alt}`}
        className="block h-[300px] w-full object-cover sm:h-[380px]"
      />
      {afterUrl && (
        <img
          src={beforeUrl}
          alt={`Original ${alt}`}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
      )}
      <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-medium">Before</span>
      {afterUrl && (
        <span className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-paper">
          After
        </span>
      )}
      {afterUrl && (
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${position}%` }}>
          <div className="absolute inset-y-0 -left-px w-0.5 bg-white/80" />
          <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-sm font-bold text-paper shadow-lg">
            {'‹ ›'}
          </div>
        </div>
      )}
      {processing && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#061018]/60 text-sm font-medium">
          Optimizing in a background worker…
        </div>
      )}
    </div>
  );
}
