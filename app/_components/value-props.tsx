import {
  BadgeDollarSign,
  CreditCard,
  Headphones,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { valueProps } from "@/lib/site-content";

/** Icon names the admin can choose from, kept small on purpose. */
export const VALUE_PROP_ICONS = {
  truck: Truck,
  badge: BadgeDollarSign,
  headphones: Headphones,
  card: CreditCard,
  shield: ShieldCheck,
  returns: RotateCcw,
  sparkle: Sparkles,
} as const;

export type ValuePropIcon = keyof typeof VALUE_PROP_ICONS;

export default async function ValueProps() {
  const props = await valueProps();

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14">
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {props.map((prop) => {
          const Icon =
            VALUE_PROP_ICONS[prop.icon as ValuePropIcon] ?? Truck;

          return (
            <li key={prop.title}>
              <Icon aria-hidden className="size-6 text-brand-deep" />
              <h3 className="mt-3 text-sm font-semibold">{prop.title}</h3>
              <p className="mt-1 text-sm text-muted">{prop.body}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
