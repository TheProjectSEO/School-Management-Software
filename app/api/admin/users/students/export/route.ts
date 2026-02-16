import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";

// GET /api/admin/users/students/export - Export students as CSV
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

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const gradeLevel = searchParams.get("gradeLevel");
    const sectionId = searchParams.get("sectionId");
    const format = searchParams.get("format") || "csv";

    // Build query
    let query = supabase
      .from("students")
      .select(`
        id,
        lrn,
        grade_level,
        status,
        enrollment_status,
        created_at,
        profile:school_profiles!inner(
          full_name,
          phone
        ),
        section:sections(
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (gradeLevel) {
      query = query.eq("grade_level", gradeLevel);
    }

    if (sectionId) {
      query = query.eq("section_id", sectionId);
    }

    const { data: students, error } = await query;

    if (error) {
      console.error("Error fetching students for export:", error);
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }

    // Transform data for export
    const exportData = (students || [])
      .filter((student) => {
        if (!search) return true;
        const profile = student.profile as unknown as { full_name: string; phone: string | null };
        const searchLower = search.toLowerCase();
        return (
          profile?.full_name?.toLowerCase().includes(searchLower) ||
          student.lrn?.toLowerCase().includes(searchLower)
        );
      })
      .map((student) => {
        const profile = student.profile as unknown as { full_name: string; phone: string | null };
        const section = student.section as unknown as { name: string } | null;

        return {
          "Full Name": profile?.full_name || "N/A",
          "LRN": student.lrn || "N/A",
          "Grade Level": student.grade_level || "N/A",
          "Section": section?.name || "N/A",
          "Status": student.status || "N/A",
          "Enrollment Status": student.enrollment_status || "N/A",
          "Phone": profile?.phone || "N/A",
          "Created At": student.created_at ? new Date(student.created_at).toLocaleDateString() : "N/A",
        };
      });

    if (format === "csv") {
      // Generate CSV
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [
        headers.join(","),
        ...exportData.map((row) =>
          headers.map((h) => `"${String(row[h as keyof typeof row] || "").replace(/"/g, '""')}"`).join(",")
        ),
      ];
      const csvContent = csvRows.join("\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="students-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (format === "excel" || format === "xlsx") {
      // Generate Excel file with styling
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();

      // Get the range of the worksheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

      // Set column widths
      const colWidths = [
        { wch: 25 }, // Full Name
        { wch: 18 }, // LRN
        { wch: 12 }, // Grade Level
        { wch: 20 }, // Section
        { wch: 12 }, // Status
        { wch: 18 }, // Enrollment Status
        { wch: 18 }, // Phone
        { wch: 15 }, // Created At
      ];
      worksheet['!cols'] = colWidths;

      // Style the header row (row 0)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;

        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
          fill: { fgColor: { rgb: "7B1113" } }, // MSU Maroon
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };
      }

      // Style data rows with alternating colors
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const isEvenRow = row % 2 === 0;
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!worksheet[cellAddress]) continue;

          worksheet[cellAddress].s = {
            fill: { fgColor: { rgb: isEvenRow ? "F9F9F9" : "FFFFFF" } },
            alignment: {
              horizontal: col === 2 || col === 4 || col === 5 ? "center" : "left", // Center Grade, Status, Enrollment
              vertical: "center"
            },
            border: {
              top: { style: "thin", color: { rgb: "E0E0E0" } },
              bottom: { style: "thin", color: { rgb: "E0E0E0" } },
              left: { style: "thin", color: { rgb: "E0E0E0" } },
              right: { style: "thin", color: { rgb: "E0E0E0" } },
            },
          };
        }
      }

      // Freeze the header row
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
        cellStyles: true
      });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="students-export-${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    }

    // For PDF or other formats, return JSON for now
    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Error in GET /api/admin/users/students/export:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
