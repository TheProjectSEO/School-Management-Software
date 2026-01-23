/**
 * Fee Category Detail API
 *
 * GET    /api/admin/finance/fee-categories/[categoryId] - Get single category
 * PATCH  /api/admin/finance/fee-categories/[categoryId] - Update category
 * DELETE /api/admin/finance/fee-categories/[categoryId] - Deactivate category
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteParams {
  params: Promise<{ categoryId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { categoryId } = await params;
    const supabase = createServiceClient();

    const { data: category, error } = await supabase
      .from("fee_categories")
      .select("*")
      .eq("id", categoryId)
      .single();

    if (error || !category) {
      return NextResponse.json(
        { success: false, error: "Fee category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Fee category fetch error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { categoryId } = await params;
    const body = await request.json();
    const {
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
      is_active,
    } = body;

    const supabase = createServiceClient();

    // Check if category exists
    const { data: existing, error: fetchError } = await supabase
      .from("fee_categories")
      .select("id, school_id")
      .eq("id", categoryId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "Fee category not found" },
        { status: 404 }
      );
    }

    // If changing code, check for duplicates
    if (code) {
      const { data: duplicate } = await supabase
        .from("fee_categories")
        .select("id")
        .eq("school_id", existing.school_id)
        .eq("code", code)
        .neq("id", categoryId)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "Another fee category with this code exists" },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code;
    if (category !== undefined) {
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
      updateData.category = category;
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (default_amount !== undefined) updateData.default_amount = default_amount;
    if (is_required !== undefined) updateData.is_required = is_required;
    if (is_refundable !== undefined) updateData.is_refundable = is_refundable;
    if (refund_policy !== undefined) updateData.refund_policy = refund_policy;
    if (applicable_grade_levels !== undefined)
      updateData.applicable_grade_levels = applicable_grade_levels;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("fee_categories")
      .update(updateData)
      .eq("id", categoryId)
      .select()
      .single();

    if (updateError) {
      console.error("Fee category update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update fee category" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: updated,
    });
  } catch (error) {
    console.error("Fee category update error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { categoryId } = await params;
    const supabase = createServiceClient();

    // Check if category exists and has any fee structures using it
    const { data: category, error: fetchError } = await supabase
      .from("fee_categories")
      .select("id, name")
      .eq("id", categoryId)
      .single();

    if (fetchError || !category) {
      return NextResponse.json(
        { success: false, error: "Fee category not found" },
        { status: 404 }
      );
    }

    // Check if any fee structures reference this category
    const { count: structureCount } = await supabase
      .from("fee_structures")
      .select("*", { count: "exact", head: true })
      .eq("fee_category_id", categoryId);

    if (structureCount && structureCount > 0) {
      // Soft delete - deactivate instead of delete
      const { error: updateError } = await supabase
        .from("fee_categories")
        .update({ is_active: false })
        .eq("id", categoryId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: "Failed to deactivate fee category" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Fee category deactivated (has associated fee structures)",
        deactivated: true,
      });
    }

    // No fee structures - can safely delete
    const { error: deleteError } = await supabase
      .from("fee_categories")
      .delete()
      .eq("id", categoryId);

    if (deleteError) {
      console.error("Fee category delete error:", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to delete fee category" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Fee category deleted",
      deleted: true,
    });
  } catch (error) {
    console.error("Fee category delete error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
