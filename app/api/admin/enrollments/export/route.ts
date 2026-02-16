import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";

// GET /api/admin/enrollments/export - Export enrollments as CSV
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
    const courseId = searchParams.get("courseId");
    const format = searchParams.get("format") || "csv";

    // Build query
    let query = supabase
      .from("enrollments")
      .select(`
        id,
        status,
        enrolled_at,
        students!inner(
          id,
          profile:school_profiles!inner(full_name, phone)
        ),
        courses!inner(
          id,
          name,
          subject_code
        ),
        sections(
          id,
          name,
          grade_level
        )
      `)
      .order("enrolled_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    const { data: enrollments, error } = await query;

    if (error) {
      console.error("Error fetching enrollments for export:", error);
      return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
    }

    // Transform data for export
    const exportData = (enrollments || []).map((enrollment) => {
      const student = enrollment.students as unknown as {
        id: string;
        profile: { full_name: string; phone: string | null };
      };
      const course = enrollment.courses as unknown as {
        id: string;
        name: string;
        subject_code: string;
      };
      const section = enrollment.sections as unknown as {
        id: string;
        name: string;
        grade_level: string;
      } | null;

      return {
        "Student Name": student?.profile?.full_name || "N/A",
        "Course": course?.name || "N/A",
        "Course Code": course?.subject_code || "N/A",
        "Section": section?.name || "N/A",
        "Grade Level": section?.grade_level || "N/A",
        "Status": enrollment.status,
        "Enrolled At": enrollment.enrolled_at ? new Date(enrollment.enrolled_at).toLocaleDateString() : "N/A",
      };
    });

    // Filter by search if provided
    const filteredData = search
      ? exportData.filter((row) =>
          Object.values(row).some((val) =>
            String(val).toLowerCase().includes(search.toLowerCase())
          )
        )
      : exportData;

    if (format === "csv") {
      // Generate CSV
      const headers = Object.keys(filteredData[0] || {});
      const csvRows = [
        headers.join(","),
        ...filteredData.map((row) =>
          headers.map((h) => `"${String(row[h as keyof typeof row] || "").replace(/"/g, '""')}"`).join(",")
        ),
      ];
      const csvContent = csvRows.join("\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="enrollments-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (format === "excel" || format === "xlsx") {
      // Generate Excel file with styling
      const worksheet = XLSX.utils.json_to_sheet(filteredData);
      const workbook = XLSX.utils.book_new();

      // Get the range of the worksheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

      // Set column widths
      const colWidths = [
        { wch: 25 }, // Student Name
        { wch: 30 }, // Course
        { wch: 15 }, // Course Code
        { wch: 20 }, // Section
        { wch: 12 }, // Grade Level
        { wch: 12 }, // Status
        { wch: 15 }, // Enrolled At
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
              horizontal: col === 2 || col === 4 || col === 5 ? "center" : "left", // Center Course Code, Grade Level, Status
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

      XLSX.utils.book_append_sheet(workbook, worksheet, "Enrollments");

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
          "Content-Disposition": `attachment; filename="enrollments-export-${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    }

    // For PDF or other formats, return JSON for now
    return NextResponse.json(filteredData);
  } catch (error) {
    console.error("Error in GET /api/admin/enrollments/export:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
