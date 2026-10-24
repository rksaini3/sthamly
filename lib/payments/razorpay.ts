import { z } from "zod";

const envSchema = z.object({
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
});

const API_BASE = "https://api.razorpay.com/v1";

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

// Server only.
export function razorpayEnv() {
  return envSchema.parse({
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  });
}

function authHeader(): string {
  const env = razorpayEnv();
  const credentials = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString(
    "base64"
  );
  return `Basic ${credentials}`;
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

// Creates an order with automatic capture. Amount is in paise.
export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: "INR",
        receipt: input.receipt,
        notes: input.notes,
        payment_capture: 1,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new PaymentError("razorpay_unreachable");
  }

  if (!response.ok) {
    // Do not log the body: it can echo request details.
    throw new PaymentError("order_failed", response.status);
  }

  return (await response.json()) as RazorpayOrder;
}

// Full or partial refund of a captured payment. Amount is in paise.
export async function refundPayment(input: {
  paymentId: string;
  amountPaise: number;
  reason: string;
}): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/payments/${input.paymentId}/refund`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        speed: "normal",
        notes: { reason: input.reason },
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new PaymentError("razorpay_unreachable");
  }

  if (!response.ok) {
    throw new PaymentError("refund_failed", response.status);
  }
}