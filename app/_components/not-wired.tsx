/** Keeps a nobody-is-fooled label on the auth shells. Delete this component and
 *  its usages when real authentication lands. */
export default function NotWired({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded border border-dashed border-line px-3 py-2 text-center text-xs text-muted">
      {children}
    </p>
  );
}
