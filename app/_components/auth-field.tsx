export default function AuthField({
  label,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="mt-5 block">
      <span className="text-xs text-muted">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-lg border border-foreground px-4 py-3 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-foreground/20"
      />
    </label>
  );
}
