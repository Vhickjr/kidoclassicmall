import { CreditCard, FileText, Home } from "lucide-react";

const STEPS = [
  { key: "address", label: "Address", icon: Home },
  { key: "payment", label: "Payment Method", icon: CreditCard },
  { key: "review", label: "Review", icon: FileText },
] as const;

export type CheckoutStep = (typeof STEPS)[number]["key"];

export default function CheckoutSteps({ current }: { current: CheckoutStep }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <ol className="mt-8 flex items-start">
      {STEPS.map((step, index) => {
        const reached = index <= currentIndex;

        return (
          <li
            key={step.key}
            className={`flex flex-col ${index === 0 ? "" : "flex-1"} ${
              index === 0 ? "items-start" : "items-end"
            }`}
          >
            <div className="flex w-full items-center">
              {index > 0 && (
                <span
                  aria-hidden
                  className="mx-3 h-px flex-1 border-t border-dashed border-muted"
                />
              )}
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded ${
                  reached
                    ? "bg-brand text-white"
                    : "bg-line text-muted"
                }`}
              >
                <step.icon aria-hidden className="size-5" />
              </span>
            </div>
            <span className="mt-2 text-sm">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
