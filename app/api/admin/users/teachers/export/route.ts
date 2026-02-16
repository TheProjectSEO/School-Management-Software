import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";

// GET /api/admin/users/teachers/export - Export teachers as CSV
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
    const department = searchParams.get("department");
    const format = searchParams.get("format") || "csv";

    // Build query
    let query = supabase
      .from("teacher_profiles")
      .select(`
        id,
        employee_id,
        department,
        is_active,
        created_at,
        profile:school_profiles!inner(
          full_name,
          phone
        )
      `)
      .order("created_at", { ascending: false });

    if (status === "active") {
      query = query.eq("is_active", true);
    } else if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    if (department) {
      query = query.eq("department", department);
    }

    const { data: teachers, error } = await query;

    if (error) {
      console.error("Error fetching teachers for export:", error);
      return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
    }

    // Transform data for export
    const exportData = (teachers || [])
      .filter((teacher) => {
        if (!search) return true;
        const profile = teacher.profile as unknown as { full_name: string; phone: string | null };
        const searchLower = search.toLowerCase();
        return (
          profile?.full_name?.toLowerCase().includes(searchLower) ||
          teacher.employee_id?.toLowerCase().includes(searchLower)
        );
      })
      .map((teacher) => {
        const profile = teacher.profile as unknown as { full_name: string; phone: string | null };

        return {
          "Full Name": profile?.full_name || "N/A",
          "Employee ID": teacher.employee_id || "N/A",
          "Department": teacher.department || "N/A",
          "Status": teacher.is_active ? "Active" : "Inactive",
          "Phone": profile?.phone || "N/A",
          "Created At": teacher.created_at ? new Date(teacher.created_at).toLocaleDateString() : "N/A",
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
          "Content-Disposition": `attachment; filename="teachers-export-${new Date().toISOString().split("T")[0]}.csv"`,
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
        { wch: 18 }, // Employee ID
        { wch: 20 }, // Department
        { wch: 12 }, // Status
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
              horizontal: col === 3 ? "center" : "left", // Center Status column
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

      XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");

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
          "Content-Disposition": `attachment; filename="teachers-export-${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    }

    // For PDF or other formats, return JSON for now
    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Error in GET /api/admin/users/teachers/export:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
