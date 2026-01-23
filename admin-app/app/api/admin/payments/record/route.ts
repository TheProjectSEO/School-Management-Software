/**
 * Manual Payment Recording API
 *
 * POST /api/admin/payments/record
 *
 * Used by admin to record manual payments:
 * - Cash payments at cashier
 * - Bank transfers/deposits
 * - Check payments
 *
 * Features:
 * - Auto-generates OR number
 * - Creates audit trail
 * - Updates account balance (via trigger)
 * - Supports check tracking (cleared/bounced)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RecordPaymentRequest {
  student_fee_account_id: string;
  payment_schedule_id?: string;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  payment_method:
    | "cash"
    | "check"
    | "bank_transfer"
    | "bank_deposit"
    | "internal_transfer";
  reference_number?: string;

  // For checks
  check_number?: string;
  check_bank?: string;
  check_date?: string;

  // For bank transfers/deposits
  bank_name?: string;
  depositor_name?: string;

  // Proof of payment
  proof_url?: string;

  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RecordPaymentRequest = await request.json();
    const {
      student_fee_account_id,
      payment_schedule_id,
      amount,
      payment_date,
      payment_method,
      reference_number,
      check_number,
      check_bank,
      check_date,
      bank_name,
      depositor_name,
      proof_url,
      notes,
    } = body;

    // Validation
    if (!student_fee_account_id) {
      return NextResponse.json(
        { success: false, error: "student_fee_account_id is required" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "amount must be positive" },
        { status: 400 }
      );
    }

    if (!payment_date) {
      return NextResponse.json(
        { success: false, error: "payment_date is required" },
        { status: 400 }
      );
    }

    if (!payment_method) {
      return NextResponse.json(
        { success: false, error: "payment_method is required" },
        { status: 400 }
      );
    }

    // Check validation for check payments
    if (payment_method === "check") {
      if (!check_number || !check_bank) {
        return NextResponse.json(
          {
            success: false,
            error: "check_number and check_bank are required for check payments",
          },
          { status: 400 }
        );
      }
    }

    const supabase = createServiceClient();

    // Get fee account
    const { data: feeAccount, error: accountError } = await supabase
      .from("student_fee_accounts")
      .select(
        `
        *,
        student:students(id, profile:school_profiles(full_name))
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
    if (feeAccount.status === "settled") {
      return NextResponse.json(
        { success: false, error: "Account is already fully paid" },
        { status: 400 }
      );
    }

    // Warn if overpayment (but allow it)
    const isOverpayment = amount > Number(feeAccount.current_balance);

    // Get OR number
    let orNumber: string | null = null;
    try {
      const { data: orData, error: orError } = await supabase.rpc(
        "get_next_or_number",
        {
          p_school_id: feeAccount.school_id,
        }
      );

      if (orError) {
        console.error("OR number generation error:", orError);
        // Continue without OR - can be assigned manually later
      } else {
        orNumber = orData;
      }
    } catch (error) {
      console.error("Failed to generate OR number:", error);
    }

    // Determine check status
    const checkStatus = payment_method === "check" ? "pending" : null;

    // For checks, the payment is initially "pending" until cleared
    const paymentStatus = payment_method === "check" ? "pending" : "completed";

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        student_fee_account_id,
        payment_schedule_id: payment_schedule_id || null,
        amount,
        payment_date,
        payment_method,
        gross_amount: amount,
        gateway_fee: 0,
        net_amount: amount,
        reference_number,
        or_number: orNumber,
        check_number,
        check_bank,
        check_date,
        check_status: checkStatus,
        bank_name,
        depositor_name,
        proof_url,
        status: paymentStatus,
        status_history: [
          {
            status: paymentStatus,
            timestamp: new Date().toISOString(),
            source: "manual_recording",
          },
        ],
        notes,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment creation error:", paymentError);
      return NextResponse.json(
        { success: false, error: "Failed to record payment" },
        { status: 500 }
      );
    }

    // If check is immediately cleared (rare), update to completed
    // Otherwise, check will be marked as cleared later

    // Update student enrollment status if fully paid (only for completed payments)
    if (paymentStatus === "completed") {
      // Get updated balance
      const { data: updatedAccount } = await supabase
        .from("student_fee_accounts")
        .select("current_balance")
        .eq("id", student_fee_account_id)
        .single();

      if (updatedAccount && updatedAccount.current_balance <= 0) {
        await supabase
          .from("students")
          .update({ enrollment_status: "fully_paid" })
          .eq("id", feeAccount.student_id);

        await supabase
          .from("student_fee_accounts")
          .update({ status: "settled" })
          .eq("id", student_fee_account_id);
      } else {
        await supabase
          .from("students")
          .update({ enrollment_status: "partial_paid" })
          .eq("id", feeAccount.student_id);
      }
    }

    // Log activity
    await supabase.from("fee_account_activity_log").insert({
      student_fee_account_id,
      action: "payment_recorded",
      description: `${payment_method.replace("_", " ")} payment of PHP ${amount.toLocaleString()} recorded${orNumber ? ` (OR: ${orNumber})` : ""}`,
      related_payment_id: payment.id,
      new_value: {
        payment_id: payment.id,
        amount,
        method: payment_method,
        or_number: orNumber,
        status: paymentStatus,
        is_overpayment: isOverpayment,
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        or_number: payment.or_number,
        status: payment.status,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
      },
      warnings: isOverpayment
        ? [`This payment exceeds the outstanding balance. Excess of PHP ${(amount - Number(feeAccount.current_balance)).toLocaleString()} will be credited.`]
        : [],
    });
  } catch (error) {
    console.error("Payment recording error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred recording the payment" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/payments/record
 *
 * Update check status (mark as cleared or bounced)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { payment_id, check_status, bounce_fee } = body;

    if (!payment_id) {
      return NextResponse.json(
        { success: false, error: "payment_id is required" },
        { status: 400 }
      );
    }

    if (!["cleared", "bounced"].includes(check_status)) {
      return NextResponse.json(
        { success: false, error: "check_status must be 'cleared' or 'bounced'" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get the payment
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*, student_fee_account:student_fee_accounts(*)")
      .eq("id", payment_id)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment.payment_method !== "check") {
      return NextResponse.json(
        { success: false, error: "This payment is not a check" },
        { status: 400 }
      );
    }

    if (payment.check_status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Check status already updated" },
        { status: 400 }
      );
    }

    if (check_status === "cleared") {
      // Mark check as cleared and payment as completed
      await supabase
        .from("payments")
        .update({
          check_status: "cleared",
          status: "completed",
          status_history: [
            ...((payment.status_history as any[]) || []),
            {
              status: "completed",
              timestamp: new Date().toISOString(),
              source: "check_cleared",
            },
          ],
        })
        .eq("id", payment_id);

      // Update student status
      const { data: updatedAccount } = await supabase
        .from("student_fee_accounts")
        .select("current_balance, student_id")
        .eq("id", payment.student_fee_account_id)
        .single();

      if (updatedAccount && updatedAccount.current_balance <= 0) {
        await supabase
          .from("students")
          .update({ enrollment_status: "fully_paid" })
          .eq("id", updatedAccount.student_id);

        await supabase
          .from("student_fee_accounts")
          .update({ status: "settled" })
          .eq("id", payment.student_fee_account_id);
      } else if (updatedAccount) {
        await supabase
          .from("students")
          .update({ enrollment_status: "partial_paid" })
          .eq("id", updatedAccount.student_id);
      }

      // Log activity
      await supabase.from("fee_account_activity_log").insert({
        student_fee_account_id: payment.student_fee_account_id,
        action: "payment_recorded",
        description: `Check #${payment.check_number} cleared`,
        related_payment_id: payment_id,
        old_value: { check_status: "pending" },
        new_value: { check_status: "cleared" },
      });
    } else if (check_status === "bounced") {
      // Mark check as bounced and payment as failed
      await supabase
        .from("payments")
        .update({
          check_status: "bounced",
          status: "failed",
          status_history: [
            ...((payment.status_history as any[]) || []),
            {
              status: "failed",
              timestamp: new Date().toISOString(),
              source: "check_bounced",
            },
          ],
        })
        .eq("id", payment_id);

      // Add bounce fee if specified
      if (bounce_fee && bounce_fee > 0) {
        // Add late fee to account
        await supabase
          .from("student_fee_accounts")
          .update({
            total_late_fees: (payment.student_fee_account as any).total_late_fees + bounce_fee,
          })
          .eq("id", payment.student_fee_account_id);
      }

      // Log activity
      await supabase.from("fee_account_activity_log").insert({
        student_fee_account_id: payment.student_fee_account_id,
        action: "payment_failed",
        description: `Check #${payment.check_number} bounced${bounce_fee ? `. Bounce fee: PHP ${bounce_fee}` : ""}`,
        related_payment_id: payment_id,
        new_value: {
          check_status: "bounced",
          bounce_fee: bounce_fee || 0,
        },
      });

      // Flag account for future check restrictions
      await supabase
        .from("student_fee_accounts")
        .update({
          notes: `${(payment.student_fee_account as any).notes || ""}\n[${new Date().toISOString()}] Check bounced - consider check restrictions.`.trim(),
        })
        .eq("id", payment.student_fee_account_id);
    }

    return NextResponse.json({
      success: true,
      message: `Check marked as ${check_status}`,
    });
  } catch (error) {
    console.error("Check status update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update check status" },
      { status: 500 }
    );
  }
}
