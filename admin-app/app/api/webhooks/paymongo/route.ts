/**
 * PayMongo Webhook Handler
 *
 * POST /api/webhooks/paymongo
 *
 * Security Features:
 * 1. Signature verification (Critical Fix #3)
 * 2. Idempotency check (prevents duplicate processing)
 * 3. Audit logging
 *
 * Handles events:
 * - checkout_session.payment.paid
 * - payment.paid
 * - payment.failed
 * - refund.refunded
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  verifyWebhookSignature,
  parseWebhookEvent,
  fromCentavos,
} from "@/lib/payments/paymongo";

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("paymongo-signature");

    // Critical Fix #3: Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("Invalid PayMongo webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse the webhook event
    const event = parseWebhookEvent(rawBody);
    const eventId = event.id;
    const eventType = event.type;

    console.log(`PayMongo webhook received: ${eventType} (${eventId})`);

    // Idempotency check: Have we already processed this event?
    const { data: existingTransaction } = await supabase
      .from("payment_gateway_transactions")
      .select("id, processed")
      .eq("external_id", eventId)
      .single();

    if (existingTransaction?.processed) {
      console.log(`Event ${eventId} already processed, skipping`);
      return NextResponse.json({
        success: true,
        message: "Already processed",
      });
    }

    // Store webhook data first (for debugging and audit)
    const { data: transaction, error: insertError } = await supabase
      .from("payment_gateway_transactions")
      .upsert(
        {
          external_id: eventId,
          gateway: "paymongo",
          webhook_payload: JSON.parse(rawBody),
          webhook_received_at: new Date().toISOString(),
          webhook_signature_valid: true,
          status: "pending",
          amount: 0, // Will be updated based on event type
          processed: false,
        },
        {
          onConflict: "gateway,external_id",
        }
      )
      .select()
      .single();

    if (insertError) {
      console.error("Failed to store webhook:", insertError);
      // Don't fail the webhook - PayMongo will retry
      return NextResponse.json({ success: true, message: "Stored" });
    }

    // Process based on event type
    switch (eventType) {
      case "checkout_session.payment.paid":
        await handleCheckoutSessionPaid(supabase, event, transaction.id);
        break;

      case "payment.paid":
        await handlePaymentPaid(supabase, event, transaction.id);
        break;

      case "payment.failed":
        await handlePaymentFailed(supabase, event, transaction.id);
        break;

      case "refund.refunded":
        await handleRefundCompleted(supabase, event, transaction.id);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    // Mark as processed
    await supabase
      .from("payment_gateway_transactions")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PayMongo webhook error:", error);
    // Return 200 to prevent retries for parsing errors
    // PayMongo will retry on 5xx errors
    return NextResponse.json(
      { error: "Processing error" },
      { status: 200 }
    );
  }
}

/**
 * Handle checkout session payment paid event
 */
async function handleCheckoutSessionPaid(
  supabase: ReturnType<typeof createServiceClient>,
  event: ReturnType<typeof parseWebhookEvent>,
  transactionId: string
) {
  const attributes = event.data.attributes as {
    payment_intent: { id: string };
    payments: Array<{
      id: string;
      attributes: {
        amount: number;
        status: string;
        paid_at: string;
        fee?: number;
        net_amount?: number;
        billing?: {
          name: string;
          email: string;
          phone: string;
        };
        source?: {
          type: string;
        };
      };
    }>;
    reference_number: string;
    metadata?: {
      student_fee_account_id?: string;
      payment_schedule_id?: string;
      student_id?: string;
    };
  };

  const payment = attributes.payments?.[0];
  if (!payment || payment.attributes.status !== "paid") {
    console.log("No paid payment in checkout session");
    return;
  }

  const metadata = attributes.metadata;
  const studentFeeAccountId = metadata?.student_fee_account_id;
  const paymentScheduleId = metadata?.payment_schedule_id;

  if (!studentFeeAccountId) {
    console.error("No student_fee_account_id in checkout metadata");
    return;
  }

  // Get the fee account
  const { data: feeAccount, error: accountError } = await supabase
    .from("student_fee_accounts")
    .select("*, student:students(id, profile:profiles(id, full_name))")
    .eq("id", studentFeeAccountId)
    .single();

  if (accountError || !feeAccount) {
    console.error("Fee account not found:", studentFeeAccountId);
    return;
  }

  const paymentAmount = fromCentavos(payment.attributes.amount);
  const gatewayFee = payment.attributes.fee
    ? fromCentavos(payment.attributes.fee)
    : 0;
  const netAmount = payment.attributes.net_amount
    ? fromCentavos(payment.attributes.net_amount)
    : paymentAmount - gatewayFee;

  // Determine payment method
  const sourceType = payment.attributes.source?.type || "unknown";
  const paymentMethod = mapPayMongoSourceToMethod(sourceType);

  // Get next OR number
  let orNumber: string | null = null;
  try {
    const { data: orData } = await supabase.rpc("get_next_or_number", {
      p_school_id: feeAccount.school_id,
    });
    orNumber = orData;
  } catch (error) {
    console.error("Failed to generate OR number:", error);
    // Continue without OR - can be assigned manually
  }

  // Create payment record
  const { data: paymentRecord, error: paymentError } = await supabase
    .from("payments")
    .insert({
      student_fee_account_id: studentFeeAccountId,
      payment_schedule_id: paymentScheduleId || null,
      amount: paymentAmount,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: paymentMethod,
      gross_amount: paymentAmount,
      gateway_fee: gatewayFee,
      net_amount: netAmount,
      gateway_reference: payment.id,
      gateway_transaction_id: transactionId,
      reference_number: attributes.reference_number,
      or_number: orNumber,
      status: "completed",
      status_history: [
        {
          status: "completed",
          timestamp: new Date().toISOString(),
          source: "paymongo_webhook",
        },
      ],
      notes: `PayMongo checkout payment via ${paymentMethod}`,
    })
    .select()
    .single();

  if (paymentError) {
    console.error("Failed to create payment record:", paymentError);
    return;
  }

  // Update gateway transaction with payment link
  await supabase
    .from("payment_gateway_transactions")
    .update({
      student_fee_account_id: studentFeeAccountId,
      payment_id: paymentRecord.id,
      amount: paymentAmount,
      payment_method_type: paymentMethod,
      status: "paid",
      paid_at: payment.attributes.paid_at,
      billing_name: payment.attributes.billing?.name,
      billing_email: payment.attributes.billing?.email,
      billing_phone: payment.attributes.billing?.phone,
    })
    .eq("id", transactionId);

  // Update student enrollment status if fully paid
  const { data: updatedAccount } = await supabase
    .from("student_fee_accounts")
    .select("current_balance")
    .eq("id", studentFeeAccountId)
    .single();

  if (updatedAccount && updatedAccount.current_balance <= 0) {
    await supabase
      .from("students")
      .update({ enrollment_status: "fully_paid" })
      .eq("id", feeAccount.student_id);

    await supabase
      .from("student_fee_accounts")
      .update({ status: "settled" })
      .eq("id", studentFeeAccountId);
  } else {
    await supabase
      .from("students")
      .update({ enrollment_status: "partial_paid" })
      .eq("id", feeAccount.student_id);
  }

  // Log activity
  await supabase.from("fee_account_activity_log").insert({
    student_fee_account_id: studentFeeAccountId,
    action: "payment_recorded",
    description: `Online payment of PHP ${paymentAmount.toLocaleString()} received via ${paymentMethod}`,
    new_value: {
      payment_id: paymentRecord.id,
      amount: paymentAmount,
      method: paymentMethod,
      or_number: orNumber,
    },
  });

  console.log(
    `Payment recorded: ${paymentRecord.id} for PHP ${paymentAmount}`
  );
}

/**
 * Handle standalone payment paid event
 */
async function handlePaymentPaid(
  supabase: ReturnType<typeof createServiceClient>,
  event: ReturnType<typeof parseWebhookEvent>,
  transactionId: string
) {
  // Similar to checkout session but for direct payment intents
  const attributes = event.data.attributes as {
    amount: number;
    status: string;
    paid_at: string;
    metadata?: {
      student_fee_account_id?: string;
    };
  };

  // Update transaction status
  await supabase
    .from("payment_gateway_transactions")
    .update({
      status: "paid",
      amount: fromCentavos(attributes.amount),
      paid_at: attributes.paid_at,
    })
    .eq("id", transactionId);
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(
  supabase: ReturnType<typeof createServiceClient>,
  event: ReturnType<typeof parseWebhookEvent>,
  transactionId: string
) {
  const attributes = event.data.attributes as {
    amount: number;
    last_payment_error?: {
      code: string;
      message: string;
    };
    metadata?: {
      student_fee_account_id?: string;
    };
  };

  // Update transaction status
  await supabase
    .from("payment_gateway_transactions")
    .update({
      status: "failed",
      amount: fromCentavos(attributes.amount),
      failure_code: attributes.last_payment_error?.code,
      failure_message: attributes.last_payment_error?.message,
    })
    .eq("id", transactionId);

  // If we have a pending payment record, mark it as failed
  const studentFeeAccountId = attributes.metadata?.student_fee_account_id;
  if (studentFeeAccountId) {
    await supabase.from("fee_account_activity_log").insert({
      student_fee_account_id: studentFeeAccountId,
      action: "payment_failed",
      description: `Online payment failed: ${attributes.last_payment_error?.message || "Unknown error"}`,
      new_value: {
        error_code: attributes.last_payment_error?.code,
        error_message: attributes.last_payment_error?.message,
      },
    });
  }
}

/**
 * Handle refund completed event
 */
async function handleRefundCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  event: ReturnType<typeof parseWebhookEvent>,
  transactionId: string
) {
  const attributes = event.data.attributes as {
    amount: number;
    payment_id: string;
    status: string;
  };

  // Find the original payment
  const { data: originalPayment } = await supabase
    .from("payments")
    .select("id, student_fee_account_id")
    .eq("gateway_reference", attributes.payment_id)
    .single();

  if (!originalPayment) {
    console.log("Original payment not found for refund");
    return;
  }

  // Update refund record if exists
  await supabase
    .from("fee_refunds")
    .update({
      status: "completed",
      gateway_refund_id: event.id,
      processed_at: new Date().toISOString(),
    })
    .eq("payment_id", originalPayment.id)
    .eq("status", "processing");

  // Log activity
  await supabase.from("fee_account_activity_log").insert({
    student_fee_account_id: originalPayment.student_fee_account_id,
    action: "refund_processed",
    description: `Refund of PHP ${fromCentavos(attributes.amount).toLocaleString()} processed`,
    related_payment_id: originalPayment.id,
    new_value: {
      refund_amount: fromCentavos(attributes.amount),
      gateway_refund_id: event.id,
    },
  });
}

/**
 * Map PayMongo source type to our payment method
 */
function mapPayMongoSourceToMethod(sourceType: string): string {
  const mapping: Record<string, string> = {
    gcash: "gcash",
    grab_pay: "grabpay",
    paymaya: "maya",
    card: "credit_card",
    dob: "bank_transfer",
    dob_ubp: "bank_transfer",
  };
  return mapping[sourceType] || "other_ewallet";
}
