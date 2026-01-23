/**
 * Fee Structures API
 *
 * GET  /api/admin/finance/fee-structures - List fee structures
 * POST /api/admin/finance/fee-structures - Create new fee structure
 *
 * Fee structures define the actual amounts charged per grade/section/student type.
 * They link fee categories to specific amounts for specific groups.
 *
 * Examples:
 * - Tuition for Grade 7: PHP 25,000
 * - Lab fee for Senior High STEM: PHP 5,000
 * - Books for all Grade 1: PHP 3,500
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const schoolYearId = searchParams.get("schoolYearId");
    const feeCategoryId = searchParams.get("feeCategoryId");
    const gradeLevel = searchParams.get("gradeLevel");
    const isActive = searchParams.get("isActive");

    const supabase = createServiceClient();

    let query = supabase
      .from("fee_structures")
      .select(
        `
        *,
        fee_category:fee_categories(id, name, code, category),
        school_year:school_years(id, year_name, status)
      `
      )
      .order("grade_level", { ascending: true })
      .order("created_at", { ascending: false });

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    if (schoolYearId) {
      query = query.eq("school_year_id", schoolYearId);
    }

    if (feeCategoryId) {
      query = query.eq("fee_category_id", feeCategoryId);
    }

    if (gradeLevel) {
      query = query.eq("grade_level", gradeLevel);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data: structures, error } = await query;

    if (error) {
      console.error("Fee structures fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch fee structures" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      structures,
    });
  } catch (error) {
    console.error("Fee structures error:", error);
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
      fee_category_id,
      name,
      description,
      grade_level,
      section_id,
      student_type,
      amount,
      is_per_unit,
      unit_label,
      max_units,
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

    if (!fee_category_id) {
      return NextResponse.json(
        { success: false, error: "fee_category_id is required" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }

    if (amount === undefined || amount < 0) {
      return NextResponse.json(
        { success: false, error: "amount must be a non-negative number" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify fee category exists and belongs to the school
    const { data: feeCategory, error: categoryError } = await supabase
      .from("fee_categories")
      .select("id, name")
      .eq("id", fee_category_id)
      .eq("school_id", school_id)
      .single();

    if (categoryError || !feeCategory) {
      return NextResponse.json(
        { success: false, error: "Fee category not found or doesn't belong to school" },
        { status: 404 }
      );
    }

    // Verify school year exists
    const { data: schoolYear, error: yearError } = await supabase
      .from("school_years")
      .select("id")
      .eq("id", school_year_id)
      .single();

    if (yearError || !schoolYear) {
      return NextResponse.json(
        { success: false, error: "School year not found" },
        { status: 404 }
      );
    }

    // Check for duplicate fee structure (same category, grade, section, type for the school year)
    const duplicateQuery = supabase
      .from("fee_structures")
      .select("id")
      .eq("school_id", school_id)
      .eq("school_year_id", school_year_id)
      .eq("fee_category_id", fee_category_id);

    if (grade_level) {
      duplicateQuery.eq("grade_level", grade_level);
    } else {
      duplicateQuery.is("grade_level", null);
    }

    if (section_id) {
      duplicateQuery.eq("section_id", section_id);
    } else {
      duplicateQuery.is("section_id", null);
    }

    if (student_type) {
      duplicateQuery.eq("student_type", student_type);
    } else {
      duplicateQuery.is("student_type", null);
    }

    const { data: duplicate } = await duplicateQuery.single();

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A fee structure with this combination already exists for this school year",
        },
        { status: 409 }
      );
    }

    const { data: newStructure, error } = await supabase
      .from("fee_structures")
      .insert({
        school_id,
        school_year_id,
        fee_category_id,
        name: name.trim(),
        description: description?.trim() || null,
        grade_level: grade_level || null,
        section_id: section_id || null,
        student_type: student_type || null,
        amount,
        is_per_unit: is_per_unit || false,
        unit_label: unit_label || null,
        max_units: max_units || null,
        is_active: true,
      })
      .select(
        `
        *,
        fee_category:fee_categories(id, name, code, category)
      `
      )
      .single();

    if (error) {
      console.error("Fee structure creation error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create fee structure" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      structure: newStructure,
    });
  } catch (error) {
    console.error("Fee structure creation error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * Helper endpoint to bulk create fee structures for a school year
 * POST /api/admin/finance/fee-structures?bulk=true
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_id, school_year_id, structures } = body;

    if (!school_id || !school_year_id || !Array.isArray(structures)) {
      return NextResponse.json(
        {
          success: false,
          error: "school_id, school_year_id, and structures array required",
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Validate all structures have required fields
    for (const structure of structures) {
      if (!structure.fee_category_id || !structure.name || structure.amount === undefined) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Each structure must have fee_category_id, name, and amount",
          },
          { status: 400 }
        );
      }
    }

    // Add school_id and school_year_id to each structure
    const structuresToInsert = structures.map((s) => ({
      ...s,
      school_id,
      school_year_id,
      is_active: true,
    }));

    const { data: created, error } = await supabase
      .from("fee_structures")
      .insert(structuresToInsert)
      .select(
        `
        *,
        fee_category:fee_categories(id, name, code, category)
      `
      );

    if (error) {
      console.error("Bulk fee structure creation error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create fee structures" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      structures: created,
      count: created?.length || 0,
    });
  } catch (error) {
    console.error("Bulk fee structure error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
