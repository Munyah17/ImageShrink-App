type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
  sendsImage?: boolean;
};

export function ConsentNote({ checked, onChange, id, sendsImage = false }: Props) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm text-muted">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 accent-accent"
      />
      <span>
        {sendsImage
          ? 'I understand this image will be sent to Groq, an external AI service, to generate suggestions. ImageShrink does not store the file. Suggestions are not verified compression results.'
          : 'I understand this request will be sent to Groq, an external AI service. No image file is attached. Suggestions are drafts, not measured file-size results.'}
      </span>
    </label>
  );
}
