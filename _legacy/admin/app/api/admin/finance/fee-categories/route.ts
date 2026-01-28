/**
 * Fee Categories API
 *
 * GET  /api/admin/finance/fee-categories - List all fee categories
 * POST /api/admin/finance/fee-categories - Create new fee category
 *
 * Fee categories define types of fees:
 * - tuition: Main tuition fees
 * - miscellaneous: Books, uniforms, supplies
 * - laboratory: Science lab, computer lab fees
 * - special: Field trips, graduation, etc.
 * - other_fee: Any other fee types
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");

    const supabase = createServiceClient();

    let query = supabase
      .from("fee_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error("Fee categories fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch fee categories" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Fee categories error:", error);
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
      name,
      code,
      category,
      description,
      default_amount,
      is_required,
      is_refundable,
      refund_policy,
      applicable_grade_levels,
      sort_order,
    } = body;

    // Validation
    if (!school_id) {
      return NextResponse.json(
        { success: false, error: "school_id is required" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: "category is required" },
        { status: 400 }
      );
    }

    const validCategories = [
      "tuition",
      "miscellaneous",
      "laboratory",
      "special",
      "other_fee",
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: `category must be one of: ${validCategories.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Generate code if not provided
    const feeCode =
      code || `${category.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Check for duplicate code within school
    const { data: existing } = await supabase
      .from("fee_categories")
      .select("id")
      .eq("school_id", school_id)
      .eq("code", feeCode)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A fee category with this code already exists" },
        { status: 409 }
      );
    }

    const { data: newCategory, error } = await supabase
      .from("fee_categories")
      .insert({
        school_id,
        name: name.trim(),
        code: feeCode,
        category,
        description: description?.trim() || null,
        default_amount: default_amount || 0,
        is_required: is_required ?? true,
        is_refundable: is_refundable ?? false,
        refund_policy: refund_policy || null,
        applicable_grade_levels: applicable_grade_levels || null,
        sort_order: sort_order || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Fee category creation error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create fee category" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: newCategory,
    });
  } catch (error) {
    console.error("Fee category creation error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
