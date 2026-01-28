/**
 * PayMongo Integration Library
 *
 * Handles all PayMongo API interactions:
 * - Creating checkout sessions
 * - Creating payment intents
 * - Processing webhooks with signature verification
 * - Handling refunds
 *
 * Security:
 * - All amounts are validated server-side (Critical Fix #2)
 * - Webhooks verify signature before processing (Critical Fix #3)
 * - Idempotency keys prevent duplicate processing
 */

import crypto from "crypto";

// Environment variables
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || "";
const PAYMONGO_PUBLIC_KEY = process.env.PAYMONGO_PUBLIC_KEY || "";
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET || "";
const PAYMONGO_API_URL = "https://api.paymongo.com/v1";

// Types
export interface PayMongoCheckoutLineItem {
  name: string;
  description?: string;
  amount: number; // In centavos (PHP 100 = 10000)
  currency: string;
  quantity: number;
}

export interface CreateCheckoutSessionParams {
  lineItems: PayMongoCheckoutLineItem[];
  paymentMethodTypes: Array<
    "gcash" | "grab_pay" | "paymaya" | "card" | "dob" | "dob_ubp"
  >;
  successUrl: string;
  cancelUrl: string;
  description?: string;
  referenceNumber?: string;
  metadata?: Record<string, string>;
  billing?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface CheckoutSession {
  id: string;
  type: string;
  attributes: {
    checkout_url: string;
    payment_intent: {
      id: string;
      attributes: {
        amount: number;
        currency: string;
        status: string;
      };
    };
    payments: Array<{
      id: string;
      type: string;
      attributes: {
        amount: number;
        status: string;
        paid_at: string;
        source: {
          type: string;
        };
      };
    }>;
    status: string;
    reference_number: string;
    created_at: number;
    updated_at: number;
  };
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  };
  created_at: number;
}

export interface PayMongoPayment {
  id: string;
  type: string;
  attributes: {
    amount: number;
    currency: string;
    status: "pending" | "paid" | "failed";
    source: {
      id: string;
      type: string;
    };
    billing?: {
      name: string;
      email: string;
      phone: string;
    };
    paid_at?: number;
    fee?: number;
    net_amount?: number;
    metadata?: Record<string, string>;
  };
}

/**
 * Create authorization header for PayMongo API
 */
function getAuthHeader(): string {
  const credentials = Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString("base64");
  return `Basic ${credentials}`;
}

/**
 * Make a request to PayMongo API
 */
async function paymongoRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${PAYMONGO_API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data.errors?.[0];
    throw new PayMongoError(
      error?.detail || "PayMongo API error",
      error?.code || "unknown",
      response.status
    );
  }

  return data;
}

/**
 * Custom error class for PayMongo errors
 */
export class PayMongoError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "PayMongoError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Create a checkout session
 *
 * This creates a PayMongo checkout page where the customer can pay.
 * Supports multiple payment methods: GCash, Maya, Cards, GrabPay
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSession> {
  // Validate minimum amount (PayMongo requires at least PHP 20)
  const totalAmount = params.lineItems.reduce(
    (sum, item) => sum + item.amount * item.quantity,
    0
  );
  if (totalAmount < 2000) {
    throw new PayMongoError(
      "Minimum payment amount is PHP 20",
      "amount_too_small",
      400
    );
  }

  const payload = {
    data: {
      attributes: {
        line_items: params.lineItems.map((item) => ({
          name: item.name,
          description: item.description,
          amount: item.amount,
          currency: item.currency || "PHP",
          quantity: item.quantity,
        })),
        payment_method_types: params.paymentMethodTypes,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        description: params.description,
        reference_number: params.referenceNumber,
        metadata: params.metadata,
        billing: params.billing
          ? {
              name: params.billing.name,
              email: params.billing.email,
              phone: params.billing.phone,
            }
          : undefined,
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
      },
    },
  };

  const response = await paymongoRequest<{ data: CheckoutSession }>(
    "/checkout_sessions",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return response.data;
}

/**
 * Retrieve a checkout session by ID
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<CheckoutSession> {
  const response = await paymongoRequest<{ data: CheckoutSession }>(
    `/checkout_sessions/${sessionId}`
  );
  return response.data;
}

/**
 * Retrieve a payment by ID
 */
export async function getPayment(paymentId: string): Promise<PayMongoPayment> {
  const response = await paymongoRequest<{ data: PayMongoPayment }>(
    `/payments/${paymentId}`
  );
  return response.data;
}

/**
 * Verify webhook signature (Critical Fix #3)
 *
 * This prevents attackers from faking webhook events.
 * PayMongo signs webhooks with HMAC-SHA256.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature || !PAYMONGO_WEBHOOK_SECRET) {
    console.error("Missing webhook signature or secret");
    return false;
  }

  try {
    // PayMongo signature format: t=timestamp,te=test_signature,li=live_signature
    const signatureParts = signature.split(",").reduce(
      (acc, part) => {
        const [key, value] = part.split("=");
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string>
    );

    const timestamp = signatureParts["t"];
    const liveSignature = signatureParts["li"];
    const testSignature = signatureParts["te"];

    // Use test signature in development, live in production
    const expectedSignature =
      process.env.NODE_ENV === "production" ? liveSignature : testSignature;

    if (!timestamp || !expectedSignature) {
      console.error("Invalid signature format");
      return false;
    }

    // Recreate the signed payload
    const signedPayload = `${timestamp}.${payload}`;

    // Calculate expected signature
    const computedSignature = crypto
      .createHmac("sha256", PAYMONGO_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest("hex");

    // Compare signatures (timing-safe)
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}

/**
 * Parse webhook event from PayMongo
 */
export function parseWebhookEvent(payload: string): WebhookEvent {
  const data = JSON.parse(payload);
  return data.data as WebhookEvent;
}

/**
 * Create a refund for a payment
 */
export async function createRefund(
  paymentId: string,
  amount: number,
  reason: string
): Promise<{ id: string; status: string }> {
  const payload = {
    data: {
      attributes: {
        payment_id: paymentId,
        amount: amount, // In centavos
        reason: reason,
      },
    },
  };

  const response = await paymongoRequest<{
    data: { id: string; attributes: { status: string } };
  }>("/refunds", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    id: response.data.id,
    status: response.data.attributes.status,
  };
}

/**
 * Convert PHP amount to centavos (PayMongo uses centavos)
 */
export function toCentavos(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert centavos to PHP
 */
export function fromCentavos(centavos: number): number {
  return centavos / 100;
}

/**
 * Generate a unique reference number for a payment
 */
export function generateReferenceNumber(
  studentId: string,
  timestamp?: number
): string {
  const ts = timestamp || Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAY-${studentId.substring(0, 8).toUpperCase()}-${ts}-${random}`;
}

/**
 * Check if PayMongo is properly configured
 */
export function isPayMongoConfigured(): boolean {
  return !!(PAYMONGO_SECRET_KEY && PAYMONGO_PUBLIC_KEY);
}

/**
 * Get PayMongo public key (safe to expose to frontend)
 */
export function getPublicKey(): string {
  return PAYMONGO_PUBLIC_KEY;
}

/**
 * Payment method display names
 */
export const PAYMENT_METHOD_NAMES: Record<string, string> = {
  gcash: "GCash",
  grab_pay: "GrabPay",
  paymaya: "Maya",
  card: "Credit/Debit Card",
  dob: "Direct Online Banking",
  dob_ubp: "UnionBank",
};

/**
 * Payment method fees (approximate, for display purposes)
 * Actual fees are determined by PayMongo based on agreement
 */
export const PAYMENT_METHOD_FEES: Record<
  string,
  { percentage: number; fixed: number }
> = {
  gcash: { percentage: 2.5, fixed: 0 },
  grab_pay: { percentage: 2.5, fixed: 0 },
  paymaya: { percentage: 2.5, fixed: 0 },
  card: { percentage: 3.5, fixed: 15 },
  dob: { percentage: 2.0, fixed: 0 },
  dob_ubp: { percentage: 2.0, fixed: 0 },
};
