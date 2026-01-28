import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import {
  getTeacherAdvisories,
  assignTeacherAsAdviser,
  removeTeacherAsAdviser,
  getAutoEnrollmentPreview,
} from "@/lib/dal/users";

// GET /api/admin/users/teachers/[id]/advisory - Get teacher's advisory sections
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("users:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: teacherId } = await params;

    // Check if preview is requested
    const { searchParams } = new URL(request.url);
    const previewSectionId = searchParams.get("preview");

    if (previewSectionId) {
      // Return auto-enrollment preview
      const preview = await getAutoEnrollmentPreview(teacherId, previewSectionId);
      return NextResponse.json(preview);
    }

    const advisories = await getTeacherAdvisories(teacherId);

    return NextResponse.json(advisories);
  } catch (error) {
    console.error("Error in GET /api/admin/users/teachers/[id]/advisory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/teachers/[id]/advisory - Assign teacher as section adviser
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("users:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: teacherId } = await params;
    const body = await request.json();
    const { sectionId, autoEnrollStudents = false } = body;

    if (!sectionId) {
      return NextResponse.json(
        { error: "sectionId is required" },
        { status: 400 }
      );
    }

    const result = await assignTeacherAsAdviser(
      teacherId,
      sectionId,
      admin.school_id,
      autoEnrollStudents
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      enrolledCount: result.enrolledCount,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/users/teachers/[id]/advisory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/teachers/[id]/advisory - Remove teacher as section adviser
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("users:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const adviserId = searchParams.get("adviserId");

    if (!adviserId) {
      return NextResponse.json(
        { error: "adviserId query parameter is required" },
        { status: 400 }
      );
    }

    const result = await removeTeacherAsAdviser(adviserId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users/teachers/[id]/advisory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
