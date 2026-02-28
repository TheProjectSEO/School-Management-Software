import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createServiceClient } from "@/lib/supabase/service";
import * as XLSX from "xlsx";

// GET /api/admin/enrollments/export - Export enrollments as CSV
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAPI("users:read");
    if (!auth.success) return auth.response;

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const courseId = searchParams.get("courseId");
    const format = searchParams.get("format") || "csv";

    // Flat select — no FK joins (BUG-001)
    let query = supabase
      .from("enrollments")
      .select("id, status, enrolled_at, student_id, course_id, section_id")
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

    // Fetch related data separately
    const studentIds = [...new Set((enrollments || []).map(e => e.student_id).filter(Boolean))];
    const courseIds = [...new Set((enrollments || []).map(e => e.course_id).filter(Boolean))];
    const sectionIds = [...new Set((enrollments || []).map(e => e.section_id).filter(Boolean))];

    const [{ data: studentsData }, { data: coursesData }, { data: sectionsData }] = await Promise.all([
      studentIds.length > 0
        ? supabase.from("students").select("id, profile_id").in("id", studentIds)
        : Promise.resolve({ data: [] }),
      courseIds.length > 0
        ? supabase.from("courses").select("id, name, subject_code").in("id", courseIds)
        : Promise.resolve({ data: [] }),
      sectionIds.length > 0
        ? supabase.from("sections").select("id, name, grade_level").in("id", sectionIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileIds = [...new Set((studentsData || []).map(s => s.profile_id).filter(Boolean))];
    const { data: profilesData } = profileIds.length > 0
      ? await supabase.from("school_profiles").select("id, full_name, phone").in("id", profileIds)
      : { data: [] };

    // Build lookup maps
    const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
    const studentProfileMap = new Map((studentsData || []).map(s => [s.id, profileMap.get(s.profile_id)]));
    const courseMap = new Map((coursesData || []).map(c => [c.id, c]));
    const sectionMap = new Map((sectionsData || []).map(s => [s.id, s]));

    // Transform data for export
    const exportData = (enrollments || []).map((enrollment) => {
      const profile = studentProfileMap.get(enrollment.student_id);
      const course = courseMap.get(enrollment.course_id);
      const section = sectionMap.get(enrollment.section_id);

      return {
        "Student Name": profile?.full_name || "N/A",
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
