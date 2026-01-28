import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/courses - List all courses
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("users:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = supabase
      .from("courses")
      .select("id, name, subject_code, description, credits, school_id")
      .order("name");

    if (search) {
      query = query.or(`name.ilike.%${search}%,subject_code.ilike.%${search}%`);
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
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canCreate = await hasPermission("users:create");
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, subject_code, description, credits } = body;

    // Validate required fields
    if (!name || !subject_code) {
      return NextResponse.json(
        { error: "Name and subject code are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check for duplicate subject_code
    const { data: existingCourse } = await supabase
      .from("courses")
      .select("id")
      .eq("subject_code", subject_code)
      .single();

    if (existingCourse) {
      return NextResponse.json(
        { error: "A course with this subject code already exists" },
        { status: 409 }
      );
    }

    // Create the course
    const { data: newCourse, error: insertError } = await supabase
      .from("courses")
      .insert({
        name,
        subject_code,
        description: description || null,
        credits: credits ?? null,
        school_id: admin.schoolId,
      })
      .select("id, name, subject_code, description, credits, school_id")
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
