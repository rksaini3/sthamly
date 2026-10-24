"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  theme: { color: string };
  handler: (response: unknown) => void;
  modal: { ondismiss: () => void };
};

type CheckoutCtor = new (options: CheckoutOptions) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: CheckoutCtor;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const POLL_MS = 4000;
const POLL_LIMIT_MS = 2 * 60 * 1000;

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("checkout_load_failed"));
    document.body.appendChild(script);
  });
}

export default function PayButton({
  consultationId,
  initialPaid,
}: {
  consultationId: string;
  initialPaid: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "opening" | "waiting">(
    initialPaid ? "waiting" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // After the browser reports success, wait for the webhook to confirm the booking.
  useEffect(() => {
    if (state !== "waiting") return;

    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > POLL_LIMIT_MS) {
        clearInterval(timer);
        setTimedOut(true);
        return;
      }
      router.refresh();
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [state, router]);

  async function pay() {
    setError(null);
    setState("opening");

    try {
      await loadCheckout();

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: consultationId }),
      });

      if (!res.ok) {
        setState("idle");
        if (res.status === 409) {
          setError("Hold का समय खत्म हो गया। Slot दोबारा चुनें।");
        } else {
          setError("Payment शुरू नहीं हो सका। थोड़ी देर बाद कोशिश करें।");
        }
        return;
      }

      const data = (await res.json()) as {
        key_id: string;
        order_id: string;
        amount: number;
        currency: string;
      };

      if (!window.Razorpay) throw new Error("checkout_missing");

      const checkout = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: "Sthamly",
        description: "30 मिनट की wellness consultation",
        theme: { color: "#2f5d50" },
        handler: () => setState("waiting"),
        modal: { ondismiss: () => setState("idle") },
      });

      checkout.open();
    } catch {
      setState("idle");
      setError("Payment शुरू नहीं हो सका। थोड़ी देर बाद कोशिश करें।");
    }
  }

  if (state === "waiting") {
    return (
      <div role="status" className="space-y-2 rounded-md bg-brand-soft p-4 text-sm text-brand">
        {timedOut ? (
          <p>
            Payment मिल गया है, पर पुष्टि में देर हो रही है। कुछ देर बाद यह पेज दोबारा खोलें। पैसे
            कटे हैं तो चिंता न करें, हम पुष्टि करेंगे।
          </p>
        ) : (
          <p>Payment मिल गया है। Booking की पुष्टि हो रही है...</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={pay}
        disabled={state === "opening"}
        className="w-full rounded-md bg-brand px-4 py-3 text-base font-medium text-white disabled:opacity-60"
      >
        {state === "opening" ? "Payment खुल रहा है..." : "Payment करें"}
      </button>
    </div>
  );
}