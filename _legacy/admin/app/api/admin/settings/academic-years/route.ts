import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import {
  getAcademicYears,
  getCurrentAcademicYear,
  createAcademicYear,
  setCurrentAcademicYear,
  deleteAcademicYear,
  getGradingPeriods,
} from "@/lib/dal/settings";

// GET /api/admin/settings/academic-years - Get academic years
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
    const currentOnly = searchParams.get("current") === "true";
    const yearId = searchParams.get("yearId");

    // Get grading periods for a specific year
    if (yearId) {
      const periods = await getGradingPeriods(yearId);
      return NextResponse.json(periods);
    }

    // Get current year only
    if (currentOnly) {
      const currentYear = await getCurrentAcademicYear(admin.school_id);
      return NextResponse.json(currentYear);
    }

    // Get all academic years
    const years = await getAcademicYears(admin.school_id);
    return NextResponse.json(years);
  } catch (error) {
    console.error("Error in GET /api/admin/settings/academic-years:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings/academic-years - Create academic year
export async function POST(request: NextRequest) {
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
    const { name, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields: name, startDate, endDate" },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    const result = await createAcademicYear(admin.school_id, {
      name,
      startDate,
      endDate,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/settings/academic-years:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/settings/academic-years - Set current academic year
export async function PATCH(request: NextRequest) {
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
    const { yearId } = body;

    if (!yearId) {
      return NextResponse.json(
        { error: "Missing yearId" },
        { status: 400 }
      );
    }

    const result = await setCurrentAcademicYear(admin.school_id, yearId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /api/admin/settings/academic-years:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/settings/academic-years - Delete academic year
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("settings:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const yearId = searchParams.get("yearId");

    if (!yearId) {
      return NextResponse.json(
        { error: "Missing yearId" },
        { status: 400 }
      );
    }

    const result = await deleteAcademicYear(yearId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/settings/academic-years:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
