"use client";

import { useActionState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { subscribe } from "@/app/_actions/subscribe";

export default function SubscribeForm() {
  const [result, action, pending] = useActionState(subscribe, undefined);

  return (
    <div>
      <form action={action} className="mt-4 flex items-center border border-white/30">
        <span className="pl-3 text-white/60">
          <Mail aria-hidden className="size-4" />
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="Your Email"
          aria-label="Email address"
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/50"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Subscribe"
          className="px-4 py-3 text-white disabled:opacity-50"
        >
          <ArrowRight aria-hidden className="size-4" />
        </button>
      </form>

      {result && (
        <p
          role="status"
          className={`mt-2 text-xs ${result.ok ? "text-white/80" : "text-red-300"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
