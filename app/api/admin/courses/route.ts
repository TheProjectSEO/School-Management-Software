import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/courses - List all courses
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAPI("users:read");
    if (!auth.success) return auth.response;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const gradeLevel = searchParams.get("grade_level");

    let query = supabase
      .from("courses")
      .select("id, name, subject_code, description, credits, grade_level, is_active, school_id")
      .eq("school_id", auth.admin.schoolId)
      .order("grade_level")
      .order("name");

    if (search) {
      query = query.or(`name.ilike.%${search}%,subject_code.ilike.%${search}%`);
    }

    if (gradeLevel) {
      query = query.eq("grade_level", gradeLevel);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching courses:", error);
      return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/admin/courses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/courses - Create a new course
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAPI("users:create");
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { name, subject_code, description, credits, grade_level } = body;

    // Validate required fields
    if (!name || !subject_code) {
      return NextResponse.json(
        { error: "Name and subject code are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check for duplicate subject_code OR name within the same school
    const { data: existingCourse } = await supabase
      .from("courses")
      .select("id, name, subject_code")
      .eq("school_id", auth.admin.schoolId)
      .or(`subject_code.eq.${subject_code},name.eq.${name}`)
      .maybeSingle();

    if (existingCourse) {
      const conflict = existingCourse.subject_code === subject_code
        ? "A subject with this subject code already exists"
        : "A subject with this name already exists";
      return NextResponse.json({ error: conflict }, { status: 409 });
    }

    // Create the course
    const { data: newCourse, error: insertError } = await supabase
      .from("courses")
      .insert({
        name,
        subject_code,
        description: description || null,
        credits: credits ?? null,
        grade_level: grade_level || null,
        is_active: true,
        school_id: auth.admin.schoolId,
      })
      .select("id, name, subject_code, description, credits, grade_level, is_active, school_id")
      .single();

    if (insertError) {
      console.error("Error creating course:", insertError);
      return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
    }

    return NextResponse.json(newCourse, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/courses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
