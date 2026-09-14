import type { Metadata } from "next";

export const metadata: Metadata = { title: "Saved Cards" };

export default function SavedCardsPage() {
  return (
    <div>
      <h2 className="font-semibold">Saved Cards</h2>

      <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
        No saved cards. When this is built, what gets stored is a token returned
        by ALAT Pay plus the last four digits they give us for display — never a
        card number, an expiry, or a CVV.
      </p>

      <div className="mt-6 max-w-xl border border-dashed border-line p-5 text-sm text-muted">
        <p className="font-semibold text-foreground">
          Why this screen stays empty for now
        </p>
        <p className="mt-2 leading-relaxed">
          Holding real card details would put the store in the strictest tier of
          PCI-DSS scope, and storing a CVV is not permitted under those rules at
          all. Card-on-file has to be ALAT Pay&rsquo;s tokenisation, which needs
          their integration set up first.
        </p>
      </div>
    </div>
  );
}
