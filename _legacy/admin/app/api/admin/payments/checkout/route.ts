/**
 * Create PayMongo Checkout Session
 *
 * POST /api/admin/payments/checkout
 *
 * Security Features:
 * 1. Server-side amount validation (Critical Fix #2)
 *    - Amount is calculated from database, NOT from client
 * 2. Validates student has outstanding balance
 * 3. Creates audit log entry
 *
 * Request body:
 * {
 *   student_fee_account_id: string,
 *   payment_schedule_id?: string,  // Optional - pay specific installment
 *   payment_type: 'full' | 'schedule' | 'custom',
 *   custom_amount?: number,  // Only for 'custom' type
 *   payment_methods?: string[]  // Optional - defaults to all
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  createCheckoutSession,
  toCentavos,
  generateReferenceNumber,
  isPayMongoConfigured,
} from "@/lib/payments/paymongo";

// Base URL for redirects
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";

interface CheckoutRequest {
  student_fee_account_id: string;
  payment_schedule_id?: string;
  payment_type: "full" | "schedule" | "custom";
  custom_amount?: number;
  payment_methods?: Array<
    "gcash" | "grab_pay" | "paymaya" | "card" | "dob" | "dob_ubp"
  >;
}

export async function POST(request: NextRequest) {
  try {
    // Check PayMongo configuration
    if (!isPayMongoConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment gateway not configured. Please contact administrator.",
        },
        { status: 503 }
      );
    }

    const body: CheckoutRequest = await request.json();
    const {
      student_fee_account_id,
      payment_schedule_id,
      payment_type,
      custom_amount,
      payment_methods,
    } = body;

    if (!student_fee_account_id) {
      return NextResponse.json(
        { success: false, error: "student_fee_account_id is required" },
        { status: 400 }
      );
    }

    if (!["full", "schedule", "custom"].includes(payment_type)) {
      return NextResponse.json(
        {
          success: false,
          error: "payment_type must be 'full', 'schedule', or 'custom'",
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // CRITICAL FIX #2: Get amount from database, NOT from client
    const { data: feeAccount, error: accountError } = await supabase
      .from("student_fee_accounts")
      .select(
        `
        *,
        student:students(
          id,
          lrn,
          grade_level,
          profile:school_profiles(id, full_name, phone)
        ),
        school:schools(id, name)
      `
      )
      .eq("id", student_fee_account_id)
      .single();

    if (accountError || !feeAccount) {
      return NextResponse.json(
        { success: false, error: "Fee account not found" },
        { status: 404 }
      );
    }

    // Validate account status
    if (feeAccount.status === "on_hold") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Account is on hold. Please contact the finance office.",
        },
        { status: 400 }
      );
    }

    if (feeAccount.status === "settled") {
      return NextResponse.json(
        { success: false, error: "Account is already fully paid" },
        { status: 400 }
      );
    }

    // Calculate payment amount (SERVER-SIDE - never trust client)
    let amountToPay: number;
    let description: string;
    let scheduleId: string | null = null;

    switch (payment_type) {
      case "full":
        // Pay entire outstanding balance
        amountToPay = Number(feeAccount.current_balance);
        description = `Full Balance Payment - ${(feeAccount.student as any)?.profile?.full_name}`;
        break;

      case "schedule":
        // Pay specific installment
        if (!payment_schedule_id) {
          return NextResponse.json(
            {
              success: false,
              error: "payment_schedule_id required for schedule payment",
            },
            { status: 400 }
          );
        }

        const { data: schedule, error: scheduleError } = await supabase
          .from("payment_schedules")
          .select("*")
          .eq("id", payment_schedule_id)
          .eq("student_fee_account_id", student_fee_account_id)
          .single();

        if (scheduleError || !schedule) {
          return NextResponse.json(
            { success: false, error: "Payment schedule not found" },
            { status: 404 }
          );
        }

        if (schedule.status === "paid") {
          return NextResponse.json(
            { success: false, error: "This installment is already paid" },
            { status: 400 }
          );
        }

        // Calculate remaining for this installment
        const remainingForSchedule =
          Number(schedule.amount_due) -
          Number(schedule.amount_paid) +
          Number(schedule.late_fee_assessed) -
          Number(schedule.late_fee_paid);

        amountToPay = remainingForSchedule;
        description = `${schedule.installment_label || `Installment #${schedule.installment_number}`} - ${(feeAccount.student as any)?.profile?.full_name}`;
        scheduleId = schedule.id;
        break;

      case "custom":
        // Custom amount (but validate it's reasonable)
        if (!custom_amount || custom_amount <= 0) {
          return NextResponse.json(
            { success: false, error: "custom_amount must be positive" },
            { status: 400 }
          );
        }

        // Cannot pay more than balance (prevent overpayment abuse)
        const maxPayable = Number(feeAccount.current_balance);
        if (custom_amount > maxPayable) {
          return NextResponse.json(
            {
              success: false,
              error: `Amount cannot exceed outstanding balance of PHP ${maxPayable.toLocaleString()}`,
            },
            { status: 400 }
          );
        }

        amountToPay = custom_amount;
        description = `Partial Payment - ${(feeAccount.student as any)?.profile?.full_name}`;
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid payment type" },
          { status: 400 }
        );
    }

    // Validate minimum amount (PayMongo requires PHP 20 minimum)
    if (amountToPay < 20) {
      return NextResponse.json(
        {
          success: false,
          error: "Minimum payment amount is PHP 20",
        },
        { status: 400 }
      );
    }

    // Generate reference number
    const referenceNumber = generateReferenceNumber(feeAccount.student_id);

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      lineItems: [
        {
          name: `School Fees - ${(feeAccount.school as any)?.name || "School"}`,
          description: description,
          amount: toCentavos(amountToPay),
          currency: "PHP",
          quantity: 1,
        },
      ],
      paymentMethodTypes: payment_methods || [
        "gcash",
        "grab_pay",
        "paymaya",
        "card",
      ],
      successUrl: `${BASE_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${BASE_URL}/payments/cancelled?session_id={CHECKOUT_SESSION_ID}`,
      description: description,
      referenceNumber: referenceNumber,
      metadata: {
        student_fee_account_id: student_fee_account_id,
        payment_schedule_id: scheduleId || "",
        student_id: feeAccount.student_id,
        payment_type: payment_type,
        calculated_amount: amountToPay.toString(),
      },
      billing: {
        name: (feeAccount.student as any)?.profile?.full_name,
        phone: (feeAccount.student as any)?.profile?.phone,
      },
    });

    // Store checkout session in gateway transactions
    await supabase.from("payment_gateway_transactions").insert({
      gateway: "paymongo",
      external_id: checkoutSession.id,
      checkout_session_id: checkoutSession.id,
      student_fee_account_id: student_fee_account_id,
      amount: amountToPay,
      currency: "PHP",
      status: "awaiting_payment",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

    // Log activity
    await supabase.from("fee_account_activity_log").insert({
      student_fee_account_id: student_fee_account_id,
      action: "payment_recorded",
      description: `Checkout session created for PHP ${amountToPay.toLocaleString()} (${payment_type} payment)`,
      new_value: {
        checkout_session_id: checkoutSession.id,
        amount: amountToPay,
        payment_type: payment_type,
        reference_number: referenceNumber,
      },
    });

    return NextResponse.json({
      success: true,
      checkout_url: checkoutSession.attributes.checkout_url,
      session_id: checkoutSession.id,
      reference_number: referenceNumber,
      amount: amountToPay,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Checkout creation error:", error);

    if (error instanceof Error && error.name === "PayMongoError") {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create checkout session",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/payments/checkout?session_id=xxx
 *
 * Check status of a checkout session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "session_id is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get transaction from our database
    const { data: transaction, error } = await supabase
      .from("payment_gateway_transactions")
      .select(
        `
        *,
        payment:payments(
          id,
          amount,
          status,
          or_number,
          payment_date
        )
      `
      )
      .eq("checkout_session_id", sessionId)
      .single();

    if (error || !transaction) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status: transaction.status,
      processed: transaction.processed,
      amount: transaction.amount,
      payment: transaction.payment,
    });
  } catch (error) {
    console.error("Checkout status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check session status" },
      { status: 500 }
    );
  }
}
