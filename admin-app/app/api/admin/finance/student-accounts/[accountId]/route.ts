/**
 * Student Fee Account Detail API
 *
 * GET   /api/admin/finance/student-accounts/[accountId] - Get full account details
 * PATCH /api/admin/finance/student-accounts/[accountId] - Update account (status, notes)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = await params;
    const supabase = createServiceClient();

    // Get main account info
    const { data: account, error: accountError } = await supabase
      .from("student_fee_accounts")
      .select(
        `
        *,
        student:students(
          id,
          lrn,
          grade_level,
          enrollment_status,
          section:sections(id, name, grade_level),
          profile:school_profiles(id, full_name, phone, email)
        ),
        payment_plan:payment_plans(id, name, code, number_of_installments),
        school_year:school_years(id, year_name, status)
      `
      )
      .eq("id", accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Get fee line items
    const { data: lineItems } = await supabase
      .from("fee_line_items")
      .select(
        `
        *,
        fee_category:fee_categories(id, name, code, category)
      `
      )
      .eq("student_fee_account_id", accountId)
      .order("created_at");

    // Get discounts
    const { data: discounts } = await supabase
      .from("fee_discounts")
      .select("*")
      .eq("student_fee_account_id", accountId)
      .order("created_at");

    // Get payment schedules
    const { data: schedules } = await supabase
      .from("payment_schedules")
      .select("*")
      .eq("student_fee_account_id", accountId)
      .order("installment_number");

    // Get payments
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("student_fee_account_id", accountId)
      .order("payment_date", { ascending: false });

    // Get activity log
    const { data: activityLog } = await supabase
      .from("fee_account_activity_log")
      .select("*")
      .eq("student_fee_account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get guardians
    const { data: guardians } = await supabase
      .from("student_guardians")
      .select("*")
      .eq("student_id", account.student_id);

    // Calculate summary stats
    const totalPaid = payments
      ?.filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const pendingPayments = payments?.filter((p) => p.status === "pending").length || 0;

    const overdueSchedules = schedules?.filter((s) => s.status === "overdue").length || 0;

    const nextDue = schedules?.find((s) => s.status === "pending" || s.status === "partially_paid");

    return NextResponse.json({
      success: true,
      account: {
        ...account,
        summary: {
          total_paid: totalPaid,
          pending_payments: pendingPayments,
          overdue_installments: overdueSchedules,
          next_due_date: nextDue?.due_date || null,
          next_due_amount: nextDue
            ? Number(nextDue.amount_due) - Number(nextDue.amount_paid)
            : null,
        },
      },
      line_items: lineItems || [],
      discounts: discounts || [],
      payment_schedules: schedules || [],
      payments: payments || [],
      activity_log: activityLog || [],
      guardians: guardians || [],
    });
  } catch (error) {
    console.error("Account detail error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = await params;
    const body = await request.json();
    const { status, notes, reason } = body;

    const supabase = createServiceClient();

    // Get current account
    const { data: account, error: fetchError } = await supabase
      .from("student_fee_accounts")
      .select("id, status, student_id, notes")
      .eq("id", accountId)
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    let logDescription = "";

    // Status change
    if (status && status !== account.status) {
      const validStatuses = ["active", "on_hold", "settled", "cancelled"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Status must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }

      updateData.status = status;
      logDescription = `Account status changed from ${account.status} to ${status}`;

      // Update student enrollment_status based on account status
      let enrollmentStatus: string | null = null;
      if (status === "on_hold") {
        enrollmentStatus = "on_hold";
      } else if (status === "settled") {
        enrollmentStatus = "fully_paid";
      } else if (status === "cancelled") {
        enrollmentStatus = "dropped";
      } else if (status === "active") {
        // Need to check balance to determine correct status
        const { data: balanceCheck } = await supabase
          .from("student_fee_accounts")
          .select("current_balance, total_paid")
          .eq("id", accountId)
          .single();

        if (balanceCheck) {
          if (Number(balanceCheck.current_balance) <= 0) {
            enrollmentStatus = "fully_paid";
          } else if (Number(balanceCheck.total_paid) > 0) {
            enrollmentStatus = "partial_paid";
          } else {
            enrollmentStatus = "assessed";
          }
        }
      }

      if (enrollmentStatus) {
        await supabase
          .from("students")
          .update({ enrollment_status: enrollmentStatus })
          .eq("id", account.student_id);
      }
    }

    // Notes update
    if (notes !== undefined) {
      updateData.notes = notes;
      if (!logDescription) {
        logDescription = "Account notes updated";
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("student_fee_accounts")
      .update(updateData)
      .eq("id", accountId)
      .select()
      .single();

    if (updateError) {
      console.error("Account update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update account" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("fee_account_activity_log").insert({
      student_fee_account_id: accountId,
      action: status ? "status_changed" : "account_updated",
      description: logDescription + (reason ? `. Reason: ${reason}` : ""),
      old_value: { status: account.status, notes: account.notes },
      new_value: updateData,
    });

    return NextResponse.json({
      success: true,
      account: updated,
    });
  } catch (error) {
    console.error("Account update error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
