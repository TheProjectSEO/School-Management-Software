import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin, listTeachers } from "@/lib/dal/admin";

// GET /api/admin/users/teachers/export - Export teachers list
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

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;

    // Get all teachers (no pagination for export)
    const result = await listTeachers({
      search,
      status,
      page: 1,
      pageSize: 10000, // Get all
    });

    const teachers = result.data || [];

    if (format === "csv") {
      // Generate CSV
      const headers = ["ID", "Full Name", "Email", "Employee ID", "Department", "Specialization", "Status", "Created At"];
      const rows = teachers.map((t: any) => [
        t.id,
        t.full_name || "",
        t.email || "",
        t.employee_id || "",
        t.department || "",
        t.specialization || "",
        t.is_active ? "Active" : "Inactive",
        t.created_at || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: string[]) => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=teachers-export.csv",
        },
      });
    }

    // For Excel/PDF, return JSON for now
    return NextResponse.json({ data: teachers, format });
  } catch (error) {
    console.error("Error in GET /api/admin/users/teachers/export:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
