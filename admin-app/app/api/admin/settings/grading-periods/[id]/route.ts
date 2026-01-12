import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import { updateGradingPeriod, GradingPeriod } from "@/lib/dal/settings";

// PUT /api/admin/settings/grading-periods/[id] - Update a grading period
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("settings:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Build updates object
    const updates: Partial<GradingPeriod> = {};
    const validFields = ["name", "short_name", "start_date", "end_date", "weight", "order"];

    for (const field of validFields) {
      if (body[field] !== undefined) {
        updates[field as keyof GradingPeriod] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Validate weight if provided
    if (updates.weight !== undefined) {
      const weight = Number(updates.weight);
      if (isNaN(weight) || weight < 0 || weight > 100) {
        return NextResponse.json(
          { error: "Weight must be a number between 0 and 100" },
          { status: 400 }
        );
      }
    }

    // Validate dates if both provided
    if (updates.start_date && updates.end_date) {
      const start = new Date(updates.start_date);
      const end = new Date(updates.end_date);

      if (start >= end) {
        return NextResponse.json(
          { error: "Start date must be before end date" },
          { status: 400 }
        );
      }
    }

    const result = await updateGradingPeriod(id, updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/admin/settings/grading-periods/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
