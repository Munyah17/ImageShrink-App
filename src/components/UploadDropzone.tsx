import { CloudUpload, LoaderCircle } from 'lucide-react';
import { useId, useState, type DragEvent } from 'react';

type Props = {
  disabled?: boolean;
  onFiles: (files: FileList | File[]) => void;
  compact?: boolean;
};

export function UploadDropzone({ disabled, onFiles, compact }: Props) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed text-center transition-colors ${
        compact ? 'px-4 py-6' : 'px-6 py-14'
      } ${isDragging ? 'border-accent bg-accent-soft/40' : 'border-line bg-panel/60 hover:border-accent'} ${
        disabled ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.target.value = '';
        }}
      />
      {disabled ? (
        <LoaderCircle className="animate-spin text-accent" size={36} aria-hidden="true" />
      ) : (
        <CloudUpload className="text-accent" size={40} aria-hidden="true" />
      )}
      <p className="mt-4 text-base font-medium">
        Drag & drop your image or <span className="text-accent">click to upload</span>
      </p>
      <p className="mt-1 text-sm text-muted">PNG, JPG, WEBP · Max 40MB</p>
    </label>
  );
}
