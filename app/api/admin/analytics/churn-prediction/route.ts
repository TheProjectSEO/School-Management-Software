import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/admin/analytics/churn-prediction
 * Predict which students are at risk of leaving (churn risk)
 *
 * Factors analyzed:
 * - Attendance rate (major factor)
 * - Grade trends (declining grades indicate risk)
 * - Engagement (login frequency, activity)
 * - Fee payment status (unpaid fees indicate risk)
 * - Recent communication (complaints, issues)
 * - Parent engagement level
 *
 * Returns:
 * - List of at-risk students with risk scores
 * - Summary statistics
 * - Recommended interventions
 */

interface ChurnRiskStudent {
  id: string;
  full_name: string;
  lrn: string;
  grade_level: string;
  section_name: string;
  risk_score: number; // 0-100 (higher = more likely to churn)
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: RiskFactor[];
  last_activity: string | null;
  recommended_actions: string[];
}

interface RiskFactor {
  factor: string;
  value: number | string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

interface ChurnSummary {
  total_students: number;
  at_risk_students: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  avg_risk_score: number;
  top_risk_factors: { factor: string; count: number }[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeLevel = searchParams.get("gradeLevel");
    const sectionId = searchParams.get("sectionId");
    const minRiskLevel = searchParams.get("minRiskLevel") || "medium";
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

    const supabase = createServiceClient();

    // Fetch all students with relevant data
    let studentsQuery = supabase
      .from("students")
      .select(`
        id,
        lrn,
        grade_level,
        school_id,
        section:sections(id, name, grade_level),
        profile:profiles(id, full_name, avatar_url)
      `)
      .limit(500);

    if (gradeLevel) {
      studentsQuery = studentsQuery.eq("grade_level", gradeLevel);
    }
    if (sectionId) {
      studentsQuery = studentsQuery.eq("section_id", sectionId);
    }

    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError) {
      throw studentsError;
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: true,
        students: [],
        summary: {
          total_students: 0,
          at_risk_students: 0,
          critical_count: 0,
          high_count: 0,
          medium_count: 0,
          low_count: 0,
          avg_risk_score: 0,
          top_risk_factors: [],
        },
      });
    }

    const studentIds = students.map(s => s.id);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Fetch attendance data
    const { data: attendanceData } = await supabase
      .from("teacher_daily_attendance")
      .select("student_id, date, status")
      .in("student_id", studentIds)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

    // Fetch submission/grade data
    const { data: submissions } = await supabase
      .from("submissions")
      .select(`
        student_id,
        score,
        status,
        submitted_at,
        assessment:assessments(total_points, type)
      `)
      .in("student_id", studentIds)
      .gte("submitted_at", ninetyDaysAgo.toISOString());

    // Fetch student progress (engagement)
    const { data: progressData } = await supabase
      .from("student_progress")
      .select("student_id, progress_percent, last_accessed_at")
      .in("student_id", studentIds)
      .gte("last_accessed_at", thirtyDaysAgo.toISOString());

    // Calculate risk for each student
    const atRiskStudents: ChurnRiskStudent[] = [];
    const allRiskFactors: Map<string, number> = new Map();

    for (const student of students) {
      const studentId = student.id;
      const riskFactors: RiskFactor[] = [];
      let totalRiskScore = 0;

      // 1. Attendance Analysis
      const studentAttendance = (attendanceData || []).filter(a => a.student_id === studentId);
      if (studentAttendance.length > 0) {
        const totalDays = studentAttendance.length;
        const presentDays = studentAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
        const attendanceRate = (presentDays / totalDays) * 100;

        if (attendanceRate < 75) {
          const impact = attendanceRate < 60 ? 'high' : attendanceRate < 70 ? 'medium' : 'low';
          const riskPoints = attendanceRate < 60 ? 35 : attendanceRate < 70 ? 25 : 15;
          totalRiskScore += riskPoints;

          riskFactors.push({
            factor: "Low Attendance",
            value: `${attendanceRate.toFixed(1)}%`,
            impact,
            description: `Attendance rate is ${attendanceRate.toFixed(1)}% (${presentDays}/${totalDays} days)`,
          });
          allRiskFactors.set("Low Attendance", (allRiskFactors.get("Low Attendance") || 0) + 1);
        }
      } else {
        // No attendance data is a risk factor
        totalRiskScore += 20;
        riskFactors.push({
          factor: "No Recent Attendance",
          value: "No data",
          impact: "medium",
          description: "No attendance records in the past 30 days",
        });
        allRiskFactors.set("No Recent Attendance", (allRiskFactors.get("No Recent Attendance") || 0) + 1);
      }

      // 2. Academic Performance Analysis
      const studentSubmissions = (submissions || []).filter(s => s.student_id === studentId);
      if (studentSubmissions.length > 0) {
        // assessment is an array from the join, get first element
        const gradedSubmissions = studentSubmissions.filter(s => s.status === 'graded' && (s.assessment as any)?.[0]?.total_points);
        if (gradedSubmissions.length >= 3) {
          const avgScore = gradedSubmissions.reduce((sum, s) => {
            const assessment = (s.assessment as any)?.[0];
            const pct = (s.score / assessment.total_points) * 100;
            return sum + pct;
          }, 0) / gradedSubmissions.length;

          if (avgScore < 65) {
            const impact = avgScore < 50 ? 'high' : avgScore < 60 ? 'medium' : 'low';
            const riskPoints = avgScore < 50 ? 30 : avgScore < 60 ? 20 : 10;
            totalRiskScore += riskPoints;

            riskFactors.push({
              factor: "Struggling Academically",
              value: `${avgScore.toFixed(1)}% avg`,
              impact,
              description: `Average grade is ${avgScore.toFixed(1)}% across ${gradedSubmissions.length} assessments`,
            });
            allRiskFactors.set("Struggling Academically", (allRiskFactors.get("Struggling Academically") || 0) + 1);
          }
        }

        // Check for missing submissions
        const pendingCount = studentSubmissions.filter(s => s.status === 'pending' || s.status === 'missing').length;
        if (pendingCount >= 3) {
          totalRiskScore += 15;
          riskFactors.push({
            factor: "Missing Assignments",
            value: `${pendingCount} missing`,
            impact: pendingCount >= 5 ? 'high' : 'medium',
            description: `Has ${pendingCount} missing or pending assignments`,
          });
          allRiskFactors.set("Missing Assignments", (allRiskFactors.get("Missing Assignments") || 0) + 1);
        }
      }

      // 3. Engagement Analysis
      const studentProgress = (progressData || []).filter(p => p.student_id === studentId);
      if (studentProgress.length === 0) {
        totalRiskScore += 20;
        riskFactors.push({
          factor: "Low Engagement",
          value: "No activity",
          impact: "medium",
          description: "No course activity in the past 30 days",
        });
        allRiskFactors.set("Low Engagement", (allRiskFactors.get("Low Engagement") || 0) + 1);
      } else {
        const mostRecent = studentProgress.reduce((latest, p) => {
          const pDate = new Date(p.last_accessed_at!);
          return pDate > new Date(latest) ? p.last_accessed_at! : latest;
        }, studentProgress[0].last_accessed_at!);

        const daysSinceActivity = Math.floor((now.getTime() - new Date(mostRecent).getTime()) / (24 * 60 * 60 * 1000));
        if (daysSinceActivity > 14) {
          totalRiskScore += 15;
          riskFactors.push({
            factor: "Inactive",
            value: `${daysSinceActivity} days`,
            impact: daysSinceActivity > 21 ? 'high' : 'medium',
            description: `Last active ${daysSinceActivity} days ago`,
          });
          allRiskFactors.set("Inactive", (allRiskFactors.get("Inactive") || 0) + 1);
        }
      }

      // Cap risk score at 100
      const finalRiskScore = Math.min(100, totalRiskScore);

      // Determine risk level
      let riskLevel: ChurnRiskStudent['risk_level'];
      if (finalRiskScore >= 70) riskLevel = 'critical';
      else if (finalRiskScore >= 50) riskLevel = 'high';
      else if (finalRiskScore >= 30) riskLevel = 'medium';
      else riskLevel = 'low';

      // Skip if below minimum risk level
      const riskLevelOrder = ['low', 'medium', 'high', 'critical'];
      if (riskLevelOrder.indexOf(riskLevel) < riskLevelOrder.indexOf(minRiskLevel as any)) {
        continue;
      }

      // Generate recommended actions
      const recommendedActions = generateRecommendations(riskFactors);

      // Get last activity
      const lastActivity = studentProgress.length > 0
        ? studentProgress.reduce((latest, p) => {
            const pDate = new Date(p.last_accessed_at!);
            return pDate > new Date(latest) ? p.last_accessed_at! : latest;
          }, studentProgress[0].last_accessed_at!)
        : null;

      atRiskStudents.push({
        id: studentId,
        full_name: (student.profile as any)?.full_name || "Unknown",
        lrn: student.lrn || "",
        grade_level: (student.section as any)?.grade_level || student.grade_level || "",
        section_name: (student.section as any)?.name || "",
        risk_score: finalRiskScore,
        risk_level: riskLevel,
        risk_factors: riskFactors,
        last_activity: lastActivity,
        recommended_actions: recommendedActions,
      });
    }

    // Sort by risk score (highest first)
    atRiskStudents.sort((a, b) => b.risk_score - a.risk_score);

    // Limit results
    const limitedResults = atRiskStudents.slice(0, limit);

    // Calculate summary
    const summary: ChurnSummary = {
      total_students: students.length,
      at_risk_students: atRiskStudents.length,
      critical_count: atRiskStudents.filter(s => s.risk_level === 'critical').length,
      high_count: atRiskStudents.filter(s => s.risk_level === 'high').length,
      medium_count: atRiskStudents.filter(s => s.risk_level === 'medium').length,
      low_count: atRiskStudents.filter(s => s.risk_level === 'low').length,
      avg_risk_score: atRiskStudents.length > 0
        ? Math.round(atRiskStudents.reduce((sum, s) => sum + s.risk_score, 0) / atRiskStudents.length)
        : 0,
      top_risk_factors: Array.from(allRiskFactors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([factor, count]) => ({ factor, count })),
    };

    return NextResponse.json({
      success: true,
      students: limitedResults,
      summary,
      metadata: {
        generated_at: new Date().toISOString(),
        analysis_period: {
          attendance: `Last 30 days`,
          academics: `Last 90 days`,
          engagement: `Last 30 days`,
        },
      },
    });
  } catch (error) {
    console.error("Churn prediction error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during analysis" },
      { status: 500 }
    );
  }
}

function generateRecommendations(riskFactors: RiskFactor[]): string[] {
  const recommendations: string[] = [];

  for (const factor of riskFactors) {
    switch (factor.factor) {
      case "Low Attendance":
        recommendations.push("Schedule parent meeting to discuss attendance");
        if (factor.impact === 'high') {
          recommendations.push("Implement daily attendance monitoring");
        }
        break;
      case "No Recent Attendance":
        recommendations.push("Contact family to verify enrollment status");
        break;
      case "Struggling Academically":
        recommendations.push("Assign peer tutor or study group");
        recommendations.push("Review learning accommodations needed");
        break;
      case "Missing Assignments":
        recommendations.push("Create assignment recovery plan");
        recommendations.push("Check for barriers to completion");
        break;
      case "Low Engagement":
      case "Inactive":
        recommendations.push("Send personalized check-in message");
        recommendations.push("Review technical access issues");
        break;
    }
  }

  // Remove duplicates and limit
  return [...new Set(recommendations)].slice(0, 4);
}
