/**
 * Payment Plans API
 *
 * GET  /api/admin/finance/payment-plans - List payment plans
 * POST /api/admin/finance/payment-plans - Create new payment plan
 *
 * Payment plans define how fees can be paid:
 * - Full payment (with early bird discount)
 * - Semestral (2 payments)
 * - Quarterly (4 payments)
 * - Monthly (10 payments)
 *
 * Each plan can have:
 * - Discount percentage (e.g., 5% for full payment)
 * - Late fee rules
 * - Installment schedule template
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const schoolYearId = searchParams.get("schoolYearId");
    const isActive = searchParams.get("isActive");

    const supabase = createServiceClient();

    let query = supabase
      .from("payment_plans")
      .select(
        `
        *,
        school_year:school_years(id, year_name, status)
      `
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    if (schoolYearId) {
      query = query.eq("school_year_id", schoolYearId);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data: plans, error } = await query;

    if (error) {
      console.error("Payment plans fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch payment plans" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error("Payment plans error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_id,
      school_year_id,
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
    } = body;

    // Validation
    if (!school_id) {
      return NextResponse.json(
        { success: false, error: "school_id is required" },
        { status: 400 }
      );
    }

    if (!school_year_id) {
      return NextResponse.json(
        { success: false, error: "school_year_id is required" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }

    if (!number_of_installments || number_of_installments < 1) {
      return NextResponse.json(
        { success: false, error: "number_of_installments must be at least 1" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Generate code if not provided
    const planCode =
      code || `PLAN-${number_of_installments}-${Date.now().toString(36).toUpperCase()}`;

    // Check for duplicate code within school year
    const { data: existing } = await supabase
      .from("payment_plans")
      .select("id")
      .eq("school_id", school_id)
      .eq("school_year_id", school_year_id)
      .eq("code", planCode)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A payment plan with this code already exists" },
        { status: 409 }
      );
    }

    // Validate late fee settings
    if (late_fee_type && !["fixed", "percentage", "both"].includes(late_fee_type)) {
      return NextResponse.json(
        { success: false, error: "late_fee_type must be 'fixed', 'percentage', or 'both'" },
        { status: 400 }
      );
    }

    // Generate default installment schedule if not provided
    let schedule = installment_schedule;
    if (!schedule && number_of_installments > 1) {
      // Create evenly distributed schedule
      schedule = [];
      const percentageEach = Math.floor(100 / number_of_installments);
      const remainder = 100 - percentageEach * number_of_installments;

      for (let i = 0; i < number_of_installments; i++) {
        schedule.push({
          installment_number: i + 1,
          label: getInstallmentLabel(i + 1, number_of_installments),
          percentage: i === 0 ? percentageEach + remainder : percentageEach,
          due_day_offset: i * 30, // Every 30 days
        });
      }
    }

    const { data: newPlan, error } = await supabase
      .from("payment_plans")
      .insert({
        school_id,
        school_year_id,
        name: name.trim(),
        code: planCode,
        description: description?.trim() || null,
        number_of_installments,
        installment_schedule: schedule || null,
        discount_percentage: discount_percentage || 0,
        discount_deadline: discount_deadline || null,
        late_fee_type: late_fee_type || null,
        late_fee_amount: late_fee_amount || 0,
        late_fee_percentage: late_fee_percentage || 0,
        grace_period_days: grace_period_days || 0,
        sort_order: sort_order || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Payment plan creation error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create payment plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: newPlan,
    });
  } catch (error) {
    console.error("Payment plan creation error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * Helper to generate human-readable installment labels
 */
function getInstallmentLabel(number: number, total: number): string {
  if (total === 1) return "Full Payment";

  if (total === 2) {
    return number === 1 ? "First Semester" : "Second Semester";
  }

  if (total === 4) {
    const quarters = ["First Quarter", "Second Quarter", "Third Quarter", "Fourth Quarter"];
    return quarters[number - 1] || `Installment ${number}`;
  }

  if (total === 10 || total === 12) {
    const months = [
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
      "January",
      "February",
      "March",
      "April",
      "May",
    ];
    if (number <= months.length) {
      return months[number - 1];
    }
  }

  return `Installment ${number}`;
}

/**
 * Generate default payment plans for a school year
 * PUT /api/admin/finance/payment-plans
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_id, school_year_id } = body;

    if (!school_id || !school_year_id) {
      return NextResponse.json(
        { success: false, error: "school_id and school_year_id required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if plans already exist for this school year
    const { count: existingCount } = await supabase
      .from("payment_plans")
      .select("*", { count: "exact", head: true })
      .eq("school_id", school_id)
      .eq("school_year_id", school_year_id);

    if (existingCount && existingCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment plans already exist for this school year",
        },
        { status: 409 }
      );
    }

    // Create default plans
    const defaultPlans = [
      {
        school_id,
        school_year_id,
        name: "Full Payment",
        code: "FULL",
        description: "Pay the full amount upfront and receive a 5% early bird discount",
        number_of_installments: 1,
        installment_schedule: [
          { installment_number: 1, label: "Full Payment", percentage: 100, due_day_offset: 0 },
        ],
        discount_percentage: 5,
        discount_deadline: null, // Set by admin
        late_fee_type: null,
        grace_period_days: 0,
        sort_order: 1,
        is_active: true,
      },
      {
        school_id,
        school_year_id,
        name: "Semestral Plan",
        code: "SEMESTRAL",
        description: "Pay in two installments - first and second semester",
        number_of_installments: 2,
        installment_schedule: [
          { installment_number: 1, label: "First Semester", percentage: 50, due_day_offset: 0 },
          { installment_number: 2, label: "Second Semester", percentage: 50, due_day_offset: 150 },
        ],
        discount_percentage: 0,
        late_fee_type: "percentage",
        late_fee_percentage: 2,
        grace_period_days: 7,
        sort_order: 2,
        is_active: true,
      },
      {
        school_id,
        school_year_id,
        name: "Quarterly Plan",
        code: "QUARTERLY",
        description: "Pay in four installments - one per quarter",
        number_of_installments: 4,
        installment_schedule: [
          { installment_number: 1, label: "First Quarter", percentage: 25, due_day_offset: 0 },
          { installment_number: 2, label: "Second Quarter", percentage: 25, due_day_offset: 75 },
          { installment_number: 3, label: "Third Quarter", percentage: 25, due_day_offset: 150 },
          { installment_number: 4, label: "Fourth Quarter", percentage: 25, due_day_offset: 225 },
        ],
        discount_percentage: 0,
        late_fee_type: "percentage",
        late_fee_percentage: 2,
        grace_period_days: 5,
        sort_order: 3,
        is_active: true,
      },
      {
        school_id,
        school_year_id,
        name: "Monthly Plan",
        code: "MONTHLY",
        description: "Pay in 10 monthly installments throughout the school year",
        number_of_installments: 10,
        installment_schedule: [
          { installment_number: 1, label: "June", percentage: 10, due_day_offset: 0 },
          { installment_number: 2, label: "July", percentage: 10, due_day_offset: 30 },
          { installment_number: 3, label: "August", percentage: 10, due_day_offset: 60 },
          { installment_number: 4, label: "September", percentage: 10, due_day_offset: 90 },
          { installment_number: 5, label: "October", percentage: 10, due_day_offset: 120 },
          { installment_number: 6, label: "November", percentage: 10, due_day_offset: 150 },
          { installment_number: 7, label: "December", percentage: 10, due_day_offset: 180 },
          { installment_number: 8, label: "January", percentage: 10, due_day_offset: 210 },
          { installment_number: 9, label: "February", percentage: 10, due_day_offset: 240 },
          { installment_number: 10, label: "March", percentage: 10, due_day_offset: 270 },
        ],
        discount_percentage: 0,
        late_fee_type: "fixed",
        late_fee_amount: 100,
        grace_period_days: 3,
        sort_order: 4,
        is_active: true,
      },
    ];

    const { data: created, error } = await supabase
      .from("payment_plans")
      .insert(defaultPlans)
      .select();

    if (error) {
      console.error("Default plans creation error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create default payment plans" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plans: created,
      message: "Created 4 default payment plans",
    });
  } catch (error) {
    console.error("Default plans error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
