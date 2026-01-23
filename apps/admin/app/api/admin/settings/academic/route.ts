import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import {
  getAcademicSettings,
  updateAcademicSettings,
  getGradingScale,
  updateGradingScale,
  AcademicSettings,
  GradingScale,
} from "@/lib/dal/settings";

// GET /api/admin/settings/academic - Get academic settings
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("settings:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "grading_scale") {
      const gradingScale = await getGradingScale(admin.school_id);
      return NextResponse.json(gradingScale);
    }

    const settings = await getAcademicSettings(admin.school_id);

    if (!settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error in GET /api/admin/settings/academic:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings/academic - Update academic settings
export async function PUT(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("settings:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, ...data } = body;

    // Handle grading scale update
    if (type === "grading_scale") {
      const { scales } = data;
      if (!scales || !Array.isArray(scales)) {
        return NextResponse.json(
          { error: "Invalid grading scale data" },
          { status: 400 }
        );
      }

      // Validate scale entries
      for (const scale of scales) {
        if (!scale.letter || scale.min_score === undefined || scale.max_score === undefined) {
          return NextResponse.json(
            { error: "Each scale must have letter, min_score, and max_score" },
            { status: 400 }
          );
        }
      }

      const result = await updateGradingScale(admin.school_id, scales as GradingScale[]);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // Handle academic settings update
    const updates: Partial<AcademicSettings> = {};
    const validFields = [
      "passing_grade", "attendance_required", "max_absences",
      "late_threshold", "class_start_time", "class_end_time"
    ];

    for (const field of validFields) {
      if (data[field] !== undefined) {
        updates[field as keyof AcademicSettings] = data[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const result = await updateAcademicSettings(admin.school_id, updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/admin/settings/academic:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
