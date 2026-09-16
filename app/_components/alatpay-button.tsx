"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

type AlatpayResponse = {
  transactionId?: string;
  data?: { transactionId?: string };
  status?: string;
};

type AlatpayPopup = { show: () => void };

declare global {
  interface Window {
    Alatpay?: {
      setup: (options: Record<string, unknown>) => AlatpayPopup;
    };
  }
}

export default function AlatpayButton({
  orderId,
  amountNaira,
  email,
  phone,
  firstName,
  lastName,
  apiKey,
  businessId,
}: {
  orderId: string;
  amountNaira: number;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  apiKey: string;
  businessId: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function settle(transactionId: string) {
    setBusy(true);
    setError(null);

    // The popup's own callback proves nothing; the server re-asks ALAT Pay.
    const response = await fetch("/api/payments/alatpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, transactionId }),
    });

    if (response.ok) {
      router.replace(`/checkout/confirmed?order=${orderId}`);
      router.refresh();
      return;
    }

    const detail = await response.json().catch(() => null);
    setError(
      detail?.error ??
        "We could not confirm that payment. If money left your account, contact us with your order number."
    );
    setBusy(false);
  }

  function open() {
    if (!window.Alatpay) {
      setError("The payment window is still loading. Try again in a moment.");
      return;
    }

    const popup = window.Alatpay.setup({
      apiKey,
      businessId,
      email,
      phone: phone ?? "",
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      currency: "NGN",
      // ALAT Pay quotes naira; our books are kobo.
      amount: amountNaira,
      metaData: { orderId },
      onTransaction: (response: AlatpayResponse) => {
        const transactionId =
          response?.data?.transactionId ?? response?.transactionId;
        if (transactionId) void settle(transactionId);
        else setError("No transaction reference came back from ALAT Pay.");
      },
      onClose: () => setBusy(false),
    });

    popup.show();
  }

  return (
    <div>
      <Script
        src="https://web.alatpay.ng/js/alatpay.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setError("Could not load the payment window.")}
      />

      <button
        type="button"
        onClick={open}
        disabled={!ready || busy}
        className="w-full bg-brand py-3.5 text-sm text-white disabled:opacity-50"
      >
        {busy ? "Confirming payment…" : ready ? "Pay now" : "Loading payment…"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
