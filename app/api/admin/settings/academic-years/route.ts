import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createServiceClient } from "@/lib/supabase/service";
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
    const auth = await requireAdminAPI();
    if (!auth.success) return auth.response;
    const admin = auth.admin;

    const { searchParams } = new URL(request.url);
    const currentOnly = searchParams.get("current") === "true";
    const yearId = searchParams.get("yearId");

    // Get grading periods for a specific year
    if (yearId) {
      const periods = await getGradingPeriods({ academicYearId: yearId });
      return NextResponse.json(periods);
    }

    // Get current year only
    if (currentOnly) {
      const currentYear = await getCurrentAcademicYear(admin.schoolId);
      return NextResponse.json(currentYear);
    }

    // Get all academic years
    const years = await getAcademicYears(admin.schoolId);
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
    const auth = await requireAdminAPI('settings:update');
    if (!auth.success) return auth.response;
    const admin = auth.admin;

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

    const result = await createAcademicYear({
      school_id: admin.schoolId,
      name,
      start_date: startDate,
      end_date: endDate,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (result.success && result.data) {
      const yearId = result.data.id;
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      const quarterMs = Math.floor((endMs - startMs) / 4);

      const quarterNames = ['First Quarter', 'Second Quarter', 'Third Quarter', 'Fourth Quarter'];
      const supabase = createServiceClient();

      for (let i = 0; i < 4; i++) {
        const qStart = new Date(startMs + i * quarterMs);
        const qEnd = i === 3 ? new Date(endMs) : new Date(startMs + (i + 1) * quarterMs - 86400000);
        await supabase
          .from('grading_periods')
          .insert({
            school_id: admin.schoolId,
            academic_year_id: yearId,
            name: quarterNames[i],
            start_date: qStart.toISOString().split('T')[0],
            end_date: qEnd.toISOString().split('T')[0],
            period_type: 'quarter',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }
    }

    return NextResponse.json({ success: true, id: result.data?.id }, { status: 201 });
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
    const auth = await requireAdminAPI('settings:update');
    if (!auth.success) return auth.response;
    const admin = auth.admin;

    const body = await request.json();
    const { yearId } = body;

    if (!yearId) {
      return NextResponse.json(
        { error: "Missing yearId" },
        { status: 400 }
      );
    }

    const result = await setCurrentAcademicYear(admin.schoolId, yearId);

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
    const auth = await requireAdminAPI('settings:update');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const yearId = searchParams.get("yearId");

    if (!yearId) {
      return NextResponse.json(
        { error: "Missing yearId" },
        { status: 400 }
      );
    }

    // Delete associated grading periods first
    const supabase = createServiceClient();
    await supabase.from('grading_periods').delete().eq('academic_year_id', yearId);

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
