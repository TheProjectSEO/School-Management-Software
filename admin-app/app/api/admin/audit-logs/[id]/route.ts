import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/audit-logs/[id] - Get a single audit log entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("audit:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("audit_logs")
      .select(`
        *,
        admin_profiles (
          profiles (
            full_name,
            email
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching audit log:", error);
      return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/admin/audit-logs/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
