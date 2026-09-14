import { BadgeDollarSign, CreditCard, Headphones, Truck } from "lucide-react";

const VALUE_PROPS = [
  {
    icon: Truck,
    title: "Free Shipping",
    body: "Free shipping on orders above ₦150,000",
  },
  {
    icon: BadgeDollarSign,
    title: "Money Guarantee",
    body: "Within 30 days for an exchange",
  },
  {
    icon: Headphones,
    title: "Online Support",
    body: "24 hours a day, 7 days a week",
  },
  {
    icon: CreditCard,
    title: "Flexible Payment",
    body: "Pay with multiple cards and transfers",
  },
];

export default function ValueProps() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14">
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROPS.map((prop) => (
          <li key={prop.title}>
            <prop.icon aria-hidden className="size-6" />
            <h3 className="mt-3 text-sm font-semibold">{prop.title}</h3>
            <p className="mt-1 text-sm text-muted">{prop.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
