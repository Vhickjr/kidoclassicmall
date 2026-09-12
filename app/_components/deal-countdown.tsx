"use client";

import { useEffect, useState } from "react";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export default function DealCountdown({ endsAt }: { endsAt: string }) {
  // Starts null so the server and the first client render agree. A clock read
  // during render would differ between the two and break hydration.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    const tick = () => setRemaining(Math.max(0, target - Date.now()));

    tick();
    const timer = setInterval(tick, SECOND);
    return () => clearInterval(timer);
  }, [endsAt]);

  const units = [
    { label: "Days", value: remaining === null ? null : Math.floor(remaining / DAY) },
    { label: "Hours", value: remaining === null ? null : Math.floor((remaining % DAY) / HOUR) },
    { label: "Mins", value: remaining === null ? null : Math.floor((remaining % HOUR) / MINUTE) },
    { label: "Secs", value: remaining === null ? null : Math.floor((remaining % MINUTE) / SECOND) },
  ];

  return (
    <dl className="mt-8 flex gap-8">
      {units.map((unit) => (
        <div key={unit.label}>
          <dd className="text-2xl font-semibold tabular-nums">
            {unit.value === null ? "--" : unit.value}
          </dd>
          <dt className="mt-1 text-sm text-muted">{unit.label}</dt>
        </div>
      ))}
    </dl>
  );
}
