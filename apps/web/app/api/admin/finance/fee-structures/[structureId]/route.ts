/**
 * Fee Structure Detail API
 *
 * GET    /api/admin/finance/fee-structures/[structureId] - Get single structure
 * PATCH  /api/admin/finance/fee-structures/[structureId] - Update structure
 * DELETE /api/admin/finance/fee-structures/[structureId] - Delete/deactivate structure
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteParams {
  params: Promise<{ structureId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { structureId } = await params;
    const supabase = createServiceClient();

    const { data: structure, error } = await supabase
      .from("fee_structures")
      .select(
        `
        *,
        fee_category:fee_categories(id, name, code, category, is_required),
        school_year:school_years(id, year_name, status),
        section:sections(id, name, grade_level)
      `
      )
      .eq("id", structureId)
      .single();

    if (error || !structure) {
      return NextResponse.json(
        { success: false, error: "Fee structure not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      structure,
    });
  } catch (error) {
    console.error("Fee structure fetch error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { structureId } = await params;
    const body = await request.json();
    const {
      name,
      description,
      grade_level,
      section_id,
      student_type,
      amount,
      is_per_unit,
      unit_label,
      max_units,
      is_active,
    } = body;

    const supabase = createServiceClient();

    // Check if structure exists
    const { data: existing, error: fetchError } = await supabase
      .from("fee_structures")
      .select("id, school_id, school_year_id, fee_category_id")
      .eq("id", structureId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "Fee structure not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (grade_level !== undefined) updateData.grade_level = grade_level || null;
    if (section_id !== undefined) updateData.section_id = section_id || null;
    if (student_type !== undefined) updateData.student_type = student_type || null;
    if (amount !== undefined) {
      if (amount < 0) {
        return NextResponse.json(
          { success: false, error: "amount must be non-negative" },
          { status: 400 }
        );
      }
      updateData.amount = amount;
    }
    if (is_per_unit !== undefined) updateData.is_per_unit = is_per_unit;
    if (unit_label !== undefined) updateData.unit_label = unit_label || null;
    if (max_units !== undefined) updateData.max_units = max_units || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("fee_structures")
      .update(updateData)
      .eq("id", structureId)
      .select(
        `
        *,
        fee_category:fee_categories(id, name, code, category)
      `
      )
      .single();

    if (updateError) {
      console.error("Fee structure update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update fee structure" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      structure: updated,
    });
  } catch (error) {
    console.error("Fee structure update error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { structureId } = await params;
    const supabase = createServiceClient();

    // Check if structure exists
    const { data: structure, error: fetchError } = await supabase
      .from("fee_structures")
      .select("id")
      .eq("id", structureId)
      .single();

    if (fetchError || !structure) {
      return NextResponse.json(
        { success: false, error: "Fee structure not found" },
        { status: 404 }
      );
    }

    // Check if any fee line items reference this structure
    const { count: lineItemCount } = await supabase
      .from("fee_line_items")
      .select("*", { count: "exact", head: true })
      .eq("fee_structure_id", structureId);

    if (lineItemCount && lineItemCount > 0) {
      // Soft delete - deactivate instead
      const { error: updateError } = await supabase
        .from("fee_structures")
        .update({ is_active: false })
        .eq("id", structureId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: "Failed to deactivate fee structure" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Fee structure deactivated (has associated fee assessments)",
        deactivated: true,
      });
    }

    // No references - can delete
    const { error: deleteError } = await supabase
      .from("fee_structures")
      .delete()
      .eq("id", structureId);

    if (deleteError) {
      console.error("Fee structure delete error:", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to delete fee structure" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Fee structure deleted",
      deleted: true,
    });
  } catch (error) {
    console.error("Fee structure delete error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
