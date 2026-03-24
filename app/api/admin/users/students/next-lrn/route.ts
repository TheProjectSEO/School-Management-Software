import { NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/admin/users/students/next-lrn
 * Returns the next available LRN for the current school year, server-side.
 * Uses MAX() on existing LRNs to avoid race conditions from client-side generation.
 */
export async function GET() {
  const auth = await requireAdminAPI("users:read");
  if (!auth.success) return auth.response;

  const supabase = createServiceClient();
  const currentYear = new Date().getFullYear();
  const prefix = `${currentYear}-MSU-`;

  // Fetch all LRNs for this school that match the current year format
  const { data, error } = await supabase
    .from("students")
    .select("lrn")
    .eq("school_id", auth.admin.schoolId)
    .like("lrn", `${prefix}%`);

  if (error) {
    console.error("Error fetching LRNs:", error);
    return NextResponse.json({ error: "Failed to generate LRN" }, { status: 500 });
  }

  const lrnPattern = /^\d{4}-MSU-(\d+)$/;
  let maxNumber = 0;

  for (const row of data ?? []) {
    if (row.lrn) {
      const match = row.lrn.match(lrnPattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }
  }

  const nextNumber = (maxNumber + 1).toString().padStart(4, "0");
  const nextLRN = `${prefix}${nextNumber}`;

  return NextResponse.json({ lrn: nextLRN });
}
