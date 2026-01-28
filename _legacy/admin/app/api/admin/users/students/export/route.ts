import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin, listStudents } from "@/lib/dal/admin";

// GET /api/admin/users/students/export - Export students list
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
    const gradeLevel = searchParams.get("gradeLevel") || undefined;

    // Get all students (no pagination for export)
    const result = await listStudents({
      search,
      status,
      page: 1,
      pageSize: 10000, // Get all
    });

    const students = result.data || [];

    if (format === "csv") {
      // Generate CSV
      const headers = ["ID", "Full Name", "Email", "LRN", "Grade Level", "Section", "Status", "Created At"];
      const rows = students.map((s: any) => [
        s.id,
        s.full_name || "",
        s.email || "",
        s.lrn || "",
        s.grade_level || "",
        s.section_name || "",
        s.status || "",
        s.created_at || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: string[]) => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=students-export.csv",
        },
      });
    }

    // For Excel/PDF, return JSON for now (frontend can handle conversion)
    return NextResponse.json({ data: students, format });
  } catch (error) {
    console.error("Error in GET /api/admin/users/students/export:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
