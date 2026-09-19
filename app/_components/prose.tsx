/** Renders plain text with blank-line paragraphs, escaped by React. Deliberately
 *  not HTML: admin input is never trusted as markup, which rules out stored XSS. */
export default function Prose({ text }: { text: string }) {
  return (
    <div className="max-w-2xl space-y-4">
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line leading-relaxed text-muted">
            {paragraph}
          </p>
        ))}
    </div>
  );
}
