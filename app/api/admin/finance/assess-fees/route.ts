/**
 * Student Fee Assessment API
 *
 * POST /api/admin/finance/assess-fees
 *
 * This is the core API for assessing fees to students.
 * Called when:
 * - Student is enrolled/approved
 * - Student changes section (fee recalculation)
 * - Manual fee assessment by admin
 *
 * Process:
 * 1. Get applicable fee structures for student's grade/section
 * 2. Create student_fee_account
 * 3. Create fee_line_items for each fee
 * 4. Apply discounts (sibling, scholarship, early bird)
 * 5. Generate payment_schedules based on payment plan
 * 6. Update student enrollment_status
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

interface AssessFeesRequest {
  student_id: string;
  school_id: string;
  school_year_id: string;
  payment_plan_id: string;
  // Optional - auto-detected from student if not provided
  grade_level?: string;
  section_id?: string;
  // Optional discounts
  scholarship_type?: string;
  scholarship_percentage?: number;
  scholarship_amount?: number;
  custom_discounts?: Array<{
    name: string;
    type: "percentage" | "fixed";
    value: number;
    applies_to?: "tuition" | "all";
  }>;
  // Optional - carry forward balance from previous year
  carry_forward_balance?: number;
  // First payment due date (defaults to today + 7 days)
  first_due_date?: string;
  // Notes
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AssessFeesRequest = await request.json();
    const {
      student_id,
      school_id,
      school_year_id,
      payment_plan_id,
      scholarship_type,
      scholarship_percentage,
      scholarship_amount,
      custom_discounts,
      carry_forward_balance,
      first_due_date,
      notes,
    } = body;

    // Validation
    if (!student_id) {
      return NextResponse.json(
        { success: false, error: "student_id is required" },
        { status: 400 }
      );
    }
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
    if (!payment_plan_id) {
      return NextResponse.json(
        { success: false, error: "payment_plan_id is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get student details
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select(
        `
        id,
        school_id,
        grade_level,
        section_id,
        enrollment_status,
        profile:school_profiles(id, full_name)
      `
      )
      .eq("id", student_id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }

    const gradeLevel = body.grade_level || student.grade_level;
    const sectionId = body.section_id || student.section_id;

    if (!gradeLevel) {
      return NextResponse.json(
        { success: false, error: "Student grade level is required" },
        { status: 400 }
      );
    }

    // Check if student already has a fee account for this school year
    const { data: existingAccount } = await supabase
      .from("student_fee_accounts")
      .select("id, status")
      .eq("student_id", student_id)
      .eq("school_year_id", school_year_id)
      .single();

    if (existingAccount) {
      return NextResponse.json(
        {
          success: false,
          error: "Student already has a fee account for this school year",
          existing_account_id: existingAccount.id,
        },
        { status: 409 }
      );
    }

    // Get payment plan
    const { data: paymentPlan, error: planError } = await supabase
      .from("payment_plans")
      .select("*")
      .eq("id", payment_plan_id)
      .eq("school_year_id", school_year_id)
      .single();

    if (planError || !paymentPlan) {
      return NextResponse.json(
        { success: false, error: "Payment plan not found" },
        { status: 404 }
      );
    }

    // Get applicable fee structures for this grade level
    const { data: feeStructures, error: structuresError } = await supabase
      .from("fee_structures")
      .select(
        `
        *,
        fee_category:fee_categories(id, name, code, category, is_required)
      `
      )
      .eq("school_id", school_id)
      .eq("school_year_id", school_year_id)
      .eq("is_active", true)
      .or(`grade_level.eq.${gradeLevel},grade_level.is.null`);

    if (structuresError) {
      console.error("Fee structures fetch error:", structuresError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch fee structures" },
        { status: 500 }
      );
    }

    // Filter for section-specific fees if section is provided
    let applicableFees = feeStructures || [];
    if (sectionId) {
      applicableFees = applicableFees.filter(
        (fee) => !fee.section_id || fee.section_id === sectionId
      );
    }

    if (applicableFees.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No fee structures found for this grade level. Please set up fee structures first.",
        },
        { status: 400 }
      );
    }

    // Calculate totals
    let totalTuition = 0;
    let totalMiscellaneous = 0;
    let totalOther = 0;

    const lineItems = applicableFees.map((fee) => {
      const category = (fee.fee_category as any)?.category || "other_fee";
      const amount = Number(fee.amount);

      if (category === "tuition") {
        totalTuition += amount;
      } else if (category === "miscellaneous") {
        totalMiscellaneous += amount;
      } else {
        totalOther += amount;
      }

      return {
        fee_structure_id: fee.id,
        fee_category_id: fee.fee_category_id,
        description: fee.name,
        amount: amount,
        quantity: 1,
        total_amount: amount,
      };
    });

    let totalAssessed = totalTuition + totalMiscellaneous + totalOther;

    // Apply carry forward balance
    if (carry_forward_balance && carry_forward_balance > 0) {
      totalAssessed += carry_forward_balance;
    }

    // Calculate discounts
    const discounts: Array<{
      student_fee_account_id?: string;
      discount_type: string;
      discount_name: string;
      calculation_type: "percentage" | "fixed";
      percentage?: number;
      fixed_amount?: number;
      discount_amount: number;
      applied_to: string;
    }> = [];

    let totalDiscounts = 0;

    // Payment plan discount (e.g., early bird for full payment)
    if (paymentPlan.discount_percentage > 0) {
      const discountAmount = (totalTuition * paymentPlan.discount_percentage) / 100;
      discounts.push({
        discount_type: "payment_plan",
        discount_name: `${paymentPlan.name} Discount`,
        calculation_type: "percentage",
        percentage: paymentPlan.discount_percentage,
        discount_amount: discountAmount,
        applied_to: "tuition",
      });
      totalDiscounts += discountAmount;
    }

    // Scholarship discount
    if (scholarship_percentage && scholarship_percentage > 0) {
      const discountAmount = (totalTuition * scholarship_percentage) / 100;
      discounts.push({
        discount_type: "scholarship",
        discount_name: scholarship_type || "Scholarship",
        calculation_type: "percentage",
        percentage: scholarship_percentage,
        discount_amount: discountAmount,
        applied_to: "tuition",
      });
      totalDiscounts += discountAmount;
    } else if (scholarship_amount && scholarship_amount > 0) {
      discounts.push({
        discount_type: "scholarship",
        discount_name: scholarship_type || "Scholarship",
        calculation_type: "fixed",
        fixed_amount: scholarship_amount,
        discount_amount: scholarship_amount,
        applied_to: "tuition",
      });
      totalDiscounts += scholarship_amount;
    }

    // Check for sibling discount
    const { data: familyMember } = await supabase
      .from("family_members")
      .select(
        `
        family_group:family_groups(
          id,
          sibling_discount:sibling_discounts(*)
        )
      `
      )
      .eq("student_id", student_id)
      .single();

    if (familyMember?.family_group) {
      // Count enrolled siblings
      const { count: siblingCount } = await supabase
        .from("family_members")
        .select("*", { count: "exact", head: true })
        .eq("family_group_id", (familyMember.family_group as any).id)
        .neq("student_id", student_id);

      const siblingNumber = (siblingCount || 0) + 1;
      const siblingDiscount = ((familyMember.family_group as any).sibling_discount || []).find(
        (d: any) =>
          siblingNumber >= d.sibling_order_from &&
          (!d.sibling_order_to || siblingNumber <= d.sibling_order_to)
      );

      if (siblingDiscount) {
        let discountAmount = 0;
        if (siblingDiscount.discount_type === "percentage") {
          discountAmount = (totalTuition * siblingDiscount.discount_percentage) / 100;
        } else {
          discountAmount = siblingDiscount.discount_amount;
        }

        discounts.push({
          discount_type: "sibling",
          discount_name: `Sibling Discount (Child #${siblingNumber})`,
          calculation_type: siblingDiscount.discount_type,
          percentage: siblingDiscount.discount_percentage,
          fixed_amount: siblingDiscount.discount_amount,
          discount_amount: discountAmount,
          applied_to: "tuition",
        });
        totalDiscounts += discountAmount;
      }
    }

    // Custom discounts
    if (custom_discounts && custom_discounts.length > 0) {
      for (const discount of custom_discounts) {
        let discountAmount = 0;
        const base = discount.applies_to === "tuition" ? totalTuition : totalAssessed;

        if (discount.type === "percentage") {
          discountAmount = (base * discount.value) / 100;
        } else {
          discountAmount = discount.value;
        }

        discounts.push({
          discount_type: "custom",
          discount_name: discount.name,
          calculation_type: discount.type,
          percentage: discount.type === "percentage" ? discount.value : undefined,
          fixed_amount: discount.type === "fixed" ? discount.value : undefined,
          discount_amount: discountAmount,
          applied_to: discount.applies_to || "all",
        });
        totalDiscounts += discountAmount;
      }
    }

    // Calculate final amounts
    const netAssessed = Math.max(0, totalAssessed - totalDiscounts);

    // Create fee account
    const { data: feeAccount, error: accountError } = await supabase
      .from("student_fee_accounts")
      .insert({
        school_id,
        student_id,
        school_year_id,
        payment_plan_id,
        grade_level_at_assessment: gradeLevel,
        total_assessed: totalAssessed,
        total_discounts: totalDiscounts,
        total_paid: 0,
        current_balance: netAssessed,
        total_late_fees: 0,
        status: "active",
        notes: notes || null,
      })
      .select()
      .single();

    if (accountError) {
      console.error("Fee account creation error:", accountError);
      return NextResponse.json(
        { success: false, error: "Failed to create fee account" },
        { status: 500 }
      );
    }

    // Create fee line items
    const lineItemsToInsert = lineItems.map((item) => ({
      ...item,
      student_fee_account_id: feeAccount.id,
    }));

    const { error: lineItemsError } = await supabase
      .from("fee_line_items")
      .insert(lineItemsToInsert);

    if (lineItemsError) {
      console.error("Fee line items creation error:", lineItemsError);
      // Rollback fee account
      await supabase.from("student_fee_accounts").delete().eq("id", feeAccount.id);
      return NextResponse.json(
        { success: false, error: "Failed to create fee line items" },
        { status: 500 }
      );
    }

    // Create discounts records
    if (discounts.length > 0) {
      const discountsToInsert = discounts.map((d) => ({
        ...d,
        student_fee_account_id: feeAccount.id,
      }));

      const { error: discountsError } = await supabase
        .from("fee_discounts")
        .insert(discountsToInsert);

      if (discountsError) {
        console.error("Discounts creation error:", discountsError);
        // Non-fatal - continue
      }
    }

    // Create payment schedules based on payment plan
    const installmentSchedule = paymentPlan.installment_schedule || [];
    const baseDate = first_due_date ? new Date(first_due_date) : new Date();
    baseDate.setDate(baseDate.getDate() + 7); // Default: 7 days from now

    const schedulesToInsert = installmentSchedule.map(
      (installment: any, index: number) => {
        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + (installment.due_day_offset || index * 30));

        const amountDue = Math.round((netAssessed * installment.percentage) / 100);

        return {
          student_fee_account_id: feeAccount.id,
          installment_number: installment.installment_number || index + 1,
          installment_label: installment.label || `Installment ${index + 1}`,
          due_date: dueDate.toISOString().split("T")[0],
          amount_due: amountDue,
          amount_paid: 0,
          late_fee_assessed: 0,
          late_fee_paid: 0,
          status: "pending",
        };
      }
    );

    const { error: schedulesError } = await supabase
      .from("payment_schedules")
      .insert(schedulesToInsert);

    if (schedulesError) {
      console.error("Payment schedules creation error:", schedulesError);
      // Non-fatal - continue
    }

    // Update student enrollment status
    await supabase
      .from("students")
      .update({ enrollment_status: "assessed" })
      .eq("id", student_id);

    // Log activity
    await supabase.from("fee_account_activity_log").insert({
      student_fee_account_id: feeAccount.id,
      action: "account_created",
      description: `Fee account created with ${paymentPlan.name}. Total: PHP ${totalAssessed.toLocaleString()}, Discounts: PHP ${totalDiscounts.toLocaleString()}, Net: PHP ${netAssessed.toLocaleString()}`,
      new_value: {
        total_assessed: totalAssessed,
        total_discounts: totalDiscounts,
        net_amount: netAssessed,
        payment_plan: paymentPlan.name,
        line_items_count: lineItems.length,
        installments_count: installmentSchedule.length,
      },
    });

    return NextResponse.json({
      success: true,
      fee_account: {
        id: feeAccount.id,
        total_assessed: totalAssessed,
        total_discounts: totalDiscounts,
        net_amount: netAssessed,
        payment_plan: paymentPlan.name,
        installments: schedulesToInsert.length,
      },
      line_items: lineItems,
      discounts: discounts,
      payment_schedules: schedulesToInsert,
    });
  } catch (error) {
    console.error("Fee assessment error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during fee assessment" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/finance/assess-fees?student_id=xxx&school_year_id=xxx
 *
 * Preview fee assessment without creating records
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const schoolYearId = searchParams.get("school_year_id");

    if (!studentId || !schoolYearId) {
      return NextResponse.json(
        { success: false, error: "student_id and school_year_id are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get student details
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select(
        `
        id,
        school_id,
        grade_level,
        section_id,
        section:sections(id, name, grade_level),
        profile:school_profiles(id, full_name)
      `
      )
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }

    // Check for existing account
    const { data: existingAccount } = await supabase
      .from("student_fee_accounts")
      .select("id, total_assessed, current_balance, status")
      .eq("student_id", studentId)
      .eq("school_year_id", schoolYearId)
      .single();

    if (existingAccount) {
      return NextResponse.json({
        success: true,
        already_assessed: true,
        existing_account: existingAccount,
      });
    }

    // Get applicable fee structures
    const { data: feeStructures } = await supabase
      .from("fee_structures")
      .select(
        `
        *,
        fee_category:fee_categories(id, name, code, category, is_required)
      `
      )
      .eq("school_id", student.school_id)
      .eq("school_year_id", schoolYearId)
      .eq("is_active", true)
      .or(`grade_level.eq.${student.grade_level},grade_level.is.null`);

    // Get available payment plans
    const { data: paymentPlans } = await supabase
      .from("payment_plans")
      .select("*")
      .eq("school_id", student.school_id)
      .eq("school_year_id", schoolYearId)
      .eq("is_active", true)
      .order("sort_order");

    // Calculate preview totals
    let totalTuition = 0;
    let totalMiscellaneous = 0;
    let totalOther = 0;

    const fees =
      feeStructures?.map((fee) => {
        const category = (fee.fee_category as any)?.category || "other_fee";
        const amount = Number(fee.amount);

        if (category === "tuition") totalTuition += amount;
        else if (category === "miscellaneous") totalMiscellaneous += amount;
        else totalOther += amount;

        return {
          id: fee.id,
          name: fee.name,
          category: (fee.fee_category as any)?.name,
          category_type: category,
          amount: amount,
          is_required: (fee.fee_category as any)?.is_required,
        };
      }) || [];

    return NextResponse.json({
      success: true,
      already_assessed: false,
      student: {
        id: student.id,
        name: (student.profile as any)?.full_name,
        grade_level: student.grade_level,
        section: (student.section as any)?.name,
      },
      fees: fees,
      summary: {
        tuition: totalTuition,
        miscellaneous: totalMiscellaneous,
        other: totalOther,
        total: totalTuition + totalMiscellaneous + totalOther,
      },
      payment_plans: paymentPlans || [],
    });
  } catch (error) {
    console.error("Fee preview error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
