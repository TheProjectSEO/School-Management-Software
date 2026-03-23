import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/audit-logs/[id] - Get a single audit log entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI('reports:read');
    if (!auth.success) return auth.response;

    const { id } = await params;
    const supabase = createAdminClient();

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
