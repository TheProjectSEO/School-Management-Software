/**
 * Payment Plan Detail API
 *
 * GET    /api/admin/finance/payment-plans/[planId] - Get single plan
 * PATCH  /api/admin/finance/payment-plans/[planId] - Update plan
 * DELETE /api/admin/finance/payment-plans/[planId] - Delete/deactivate plan
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteParams {
  params: Promise<{ planId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId } = await params;
    const supabase = createServiceClient();

    const { data: plan, error } = await supabase
      .from("payment_plans")
      .select(
        `
        *,
        school_year:school_years(id, year_name, status)
      `
      )
      .eq("id", planId)
      .single();

    if (error || !plan) {
      return NextResponse.json(
        { success: false, error: "Payment plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Payment plan fetch error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId } = await params;
    const body = await request.json();
    const {
      name,
      code,
      description,
      number_of_installments,
      installment_schedule,
      discount_percentage,
      discount_deadline,
      late_fee_type,
      late_fee_amount,
      late_fee_percentage,
      grace_period_days,
      sort_order,
      is_active,
    } = body;

    const supabase = createServiceClient();

    // Check if plan exists
    const { data: existing, error: fetchError } = await supabase
      .from("payment_plans")
      .select("id, school_id, school_year_id")
      .eq("id", planId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "Payment plan not found" },
        { status: 404 }
      );
    }

    // If changing code, check for duplicates
    if (code) {
      const { data: duplicate } = await supabase
        .from("payment_plans")
        .select("id")
        .eq("school_id", existing.school_id)
        .eq("school_year_id", existing.school_year_id)
        .eq("code", code)
        .neq("id", planId)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "Another payment plan with this code exists" },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (number_of_installments !== undefined) {
      if (number_of_installments < 1) {
        return NextResponse.json(
          { success: false, error: "number_of_installments must be at least 1" },
          { status: 400 }
        );
      }
      updateData.number_of_installments = number_of_installments;
    }
    if (installment_schedule !== undefined)
      updateData.installment_schedule = installment_schedule;
    if (discount_percentage !== undefined) updateData.discount_percentage = discount_percentage;
    if (discount_deadline !== undefined) updateData.discount_deadline = discount_deadline;
    if (late_fee_type !== undefined) {
      if (late_fee_type && !["fixed", "percentage", "both"].includes(late_fee_type)) {
        return NextResponse.json(
          { success: false, error: "late_fee_type must be 'fixed', 'percentage', or 'both'" },
          { status: 400 }
        );
      }
      updateData.late_fee_type = late_fee_type;
    }
    if (late_fee_amount !== undefined) updateData.late_fee_amount = late_fee_amount;
    if (late_fee_percentage !== undefined) updateData.late_fee_percentage = late_fee_percentage;
    if (grace_period_days !== undefined) updateData.grace_period_days = grace_period_days;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("payment_plans")
      .update(updateData)
      .eq("id", planId)
      .select()
      .single();

    if (updateError) {
      console.error("Payment plan update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update payment plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: updated,
    });
  } catch (error) {
    console.error("Payment plan update error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId } = await params;
    const supabase = createServiceClient();

    // Check if plan exists
    const { data: plan, error: fetchError } = await supabase
      .from("payment_plans")
      .select("id")
      .eq("id", planId)
      .single();

    if (fetchError || !plan) {
      return NextResponse.json(
        { success: false, error: "Payment plan not found" },
        { status: 404 }
      );
    }

    // Check if any fee accounts use this plan
    const { count: accountCount } = await supabase
      .from("student_fee_accounts")
      .select("*", { count: "exact", head: true })
      .eq("payment_plan_id", planId);

    if (accountCount && accountCount > 0) {
      // Soft delete - deactivate instead
      const { error: updateError } = await supabase
        .from("payment_plans")
        .update({ is_active: false })
        .eq("id", planId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: "Failed to deactivate payment plan" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Payment plan deactivated (used by ${accountCount} student accounts)`,
        deactivated: true,
      });
    }

    // No references - can delete
    const { error: deleteError } = await supabase
      .from("payment_plans")
      .delete()
      .eq("id", planId);

    if (deleteError) {
      console.error("Payment plan delete error:", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to delete payment plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment plan deleted",
      deleted: true,
    });
  } catch (error) {
    console.error("Payment plan delete error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
