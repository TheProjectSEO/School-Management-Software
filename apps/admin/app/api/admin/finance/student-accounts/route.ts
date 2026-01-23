/**
 * Student Fee Accounts API
 *
 * GET /api/admin/finance/student-accounts - List all student fee accounts
 *
 * Query params:
 * - schoolId: Filter by school
 * - schoolYearId: Filter by school year
 * - status: Filter by account status
 * - gradeLevel: Filter by grade level
 * - minBalance: Filter by minimum balance
 * - search: Search by student name/LRN
 * - limit/offset: Pagination
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const schoolYearId = searchParams.get("schoolYearId");
    const status = searchParams.get("status");
    const gradeLevel = searchParams.get("gradeLevel");
    const minBalance = searchParams.get("minBalance");
    const search = searchParams.get("search");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
    const offset = Number(searchParams.get("offset") || 0);

    const supabase = createServiceClient();

    let query = supabase
      .from("student_fee_accounts")
      .select(
        `
        *,
        student:students(
          id,
          lrn,
          grade_level,
          enrollment_status,
          section:sections(id, name),
          profile:school_profiles(id, full_name, phone)
        ),
        payment_plan:payment_plans(id, name, code),
        school_year:school_years(id, year_name)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    if (schoolYearId) {
      query = query.eq("school_year_id", schoolYearId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (gradeLevel) {
      query = query.eq("grade_level_at_assessment", gradeLevel);
    }

    if (minBalance) {
      query = query.gte("current_balance", Number(minBalance));
    }

    const { data: accounts, error, count } = await query;

    if (error) {
      console.error("Student accounts fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch student accounts" },
        { status: 500 }
      );
    }

    // If search is provided, filter in memory (for student name search)
    let filteredAccounts = accounts || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAccounts = filteredAccounts.filter((account) => {
        const student = account.student as any;
        const name = student?.profile?.full_name?.toLowerCase() || "";
        const lrn = student?.lrn?.toLowerCase() || "";
        return name.includes(searchLower) || lrn.includes(searchLower);
      });
    }

    return NextResponse.json({
      success: true,
      accounts: filteredAccounts,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Student accounts error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
