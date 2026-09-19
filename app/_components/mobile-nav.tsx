"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";

export type MobileLink = {
  href: string;
  label: string;
  /** Tapping a link with children opens them in the same panel instead of
   *  navigating — so Shop can show the categories without leaving the menu. */
  children?: MobileLink[];
  /** Wording for the link back to the parent page itself. */
  allLabel?: string;
};

/**
 * The small-screen navigation. A plain disclosure rather than a drawer library:
 * it closes on route change and on Escape, and it locks the page behind it so
 * the body does not scroll under an open menu.
 */
export default function MobileNav({
  links,
  label = "Menu",
  children,
}: {
  links: MobileLink[];
  label?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Which sub-list is showing, if any. Reset whenever the drawer closes so it
  // always reopens at the top level.
  const [submenu, setSubmenu] = useState<MobileLink | null>(null);

  function close() {
    setOpen(false);
    setSubmenu(null);
  }

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      // Escape steps back out of a sub-list first, then shuts the drawer.
      if (event.key !== "Escape") return;
      setSubmenu((current) => {
        if (current) return null;
        setOpen(false);
        return null;
      });
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open ${label.toLowerCase()}`}
        aria-expanded={open}
        className="lg:hidden"
      >
        <Menu aria-hidden className="size-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="absolute inset-0 bg-foreground/40"
          />

          <nav className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              {submenu ? (
                <button
                  type="button"
                  onClick={() => setSubmenu(null)}
                  className="flex items-center gap-1.5 text-sm font-semibold"
                >
                  <ChevronLeft aria-hidden className="size-4" />
                  {submenu.label}
                </button>
              ) : (
                <span className="text-sm font-semibold">{label}</span>
              )}

              <button type="button" onClick={close} aria-label="Close menu">
                <X aria-hidden className="size-5" />
              </button>
            </div>

            <ul className="flex-1 py-2">
              {submenu ? (
                <>
                  {/* The parent stays reachable: tapping Shop should still be
                      able to take you to the whole shop. */}
                  <li>
                    <Link
                      href={submenu.href}
                      onClick={close}
                      className="block px-5 py-3 text-sm font-semibold hover:bg-brand-soft/40"
                    >
                      {submenu.allLabel ?? `All ${submenu.label}`}
                    </Link>
                  </li>

                  {submenu.children?.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={close}
                        className="block px-5 py-3 text-sm text-muted hover:bg-brand-soft/40 hover:text-foreground"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </>
              ) : (
                links.map((link) =>
                  link.children && link.children.length > 0 ? (
                    <li key={link.href}>
                      <button
                        type="button"
                        onClick={() => setSubmenu(link)}
                        aria-expanded={false}
                        className="flex w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-brand-soft/40"
                      >
                        {link.label}
                        <ChevronRight aria-hidden className="size-4" />
                      </button>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={close}
                        className="block px-5 py-3 text-sm hover:bg-brand-soft/40"
                      >
                        {link.label}
                      </Link>
                    </li>
                  )
                )
              )}
            </ul>

            {children && (
              <div className="border-t border-line px-5 py-4">{children}</div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
