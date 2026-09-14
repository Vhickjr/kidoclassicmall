export default function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  name?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="mt-5 block">
      <span className="text-xs text-muted">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="mt-1.5 w-full rounded-lg border border-foreground px-4 py-3 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
