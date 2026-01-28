import { NextRequest, NextResponse } from "next/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/teacher/ai/student-alerts
 * Analyze student data and generate smart alerts for at-risk students
 *
 * Tables used:
 * - students (read): Get student info
 * - submissions (read): Get submission history and grades
 * - teacher_daily_attendance (read): Get attendance data
 * - student_progress (read): Get learning progress
 * - enrollments (read): Get enrolled courses
 *
 * Alert types:
 * - declining_grades: Student's recent grades are lower than previous period
 * - attendance_drop: Attendance rate has dropped significantly
 * - missing_submissions: Student has overdue/missing assignments
 * - low_engagement: Low progress or activity in courses
 * - failing_risk: Student at risk of failing based on current grades
 */

export interface StudentAlert {
  id: string;
  student_id: string;
  student_name: string;
  student_lrn: string;
  student_avatar?: string;
  section_id: string;
  section_name: string;
  grade_level: string;
  alert_type: 'declining_grades' | 'attendance_drop' | 'missing_submissions' | 'low_engagement' | 'failing_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics: {
    current_value: number;
    previous_value?: number;
    threshold?: number;
    trend?: 'up' | 'down' | 'stable';
  };
  course_id?: string;
  course_name?: string;
  detected_at: string;
  recommended_actions: string[];
}

export async function GET(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId");
    const courseId = searchParams.get("courseId");
    const alertType = searchParams.get("alertType");
    const minSeverity = searchParams.get("minSeverity") || "low";

    const supabase = await createClient();
    const teacherId = authResult.teacher.id;

    // Get teacher's assigned sections/courses
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select(`
        id,
        section_id,
        course_id,
        section:sections(id, name, grade_level),
        course:courses(id, name)
      `)
      .eq("teacher_profile_id", teacherId);

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ success: true, alerts: [], message: "No assigned sections found" });
    }

    // Get section IDs teacher has access to
    const teacherSectionIds = [...new Set(assignments.map(a => a.section_id))];
    const teacherCourseIds = [...new Set(assignments.map(a => a.course_id))];

    // Filter by specific section/course if provided
    const targetSectionIds = sectionId
      ? teacherSectionIds.filter(id => id === sectionId)
      : teacherSectionIds;

    const targetCourseIds = courseId
      ? teacherCourseIds.filter(id => id === courseId)
      : teacherCourseIds;

    if (targetSectionIds.length === 0) {
      return NextResponse.json({ success: false, error: "No access to requested section" }, { status: 403 });
    }

    // Get students in teacher's sections
    const { data: students } = await supabase
      .from("students")
      .select(`
        id,
        lrn,
        grade_level,
        section_id,
        section:sections(id, name, grade_level),
        profile:profiles(id, full_name, avatar_url)
      `)
      .in("section_id", targetSectionIds);

    if (!students || students.length === 0) {
      return NextResponse.json({ success: true, alerts: [], message: "No students found in assigned sections" });
    }

    const studentIds = students.map(s => s.id);
    const alerts: StudentAlert[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Fetch submission data for grade analysis
    const { data: submissions } = await supabase
      .from("submissions")
      .select(`
        id,
        student_id,
        assessment_id,
        score,
        status,
        submitted_at,
        assessment:assessments(
          id,
          title,
          total_points,
          due_date,
          course_id,
          course:courses(id, name)
        )
      `)
      .in("student_id", studentIds)
      .in("assessment.course_id", targetCourseIds)
      .order("submitted_at", { ascending: false });

    // Fetch attendance data
    const { data: attendanceData } = await supabase
      .from("teacher_daily_attendance")
      .select("student_id, date, status")
      .in("student_id", studentIds)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false });

    // Fetch assessments for missing submission detection
    const { data: assessments } = await supabase
      .from("assessments")
      .select("id, title, due_date, course_id, total_points, course:courses(id, name)")
      .in("course_id", targetCourseIds)
      .lte("due_date", now.toISOString())
      .gte("due_date", thirtyDaysAgo.toISOString());

    // Fetch student progress
    const { data: progressData } = await supabase
      .from("student_progress")
      .select("student_id, course_id, lesson_id, progress_percent, last_accessed_at")
      .in("student_id", studentIds)
      .gte("last_accessed_at", thirtyDaysAgo.toISOString());

    // Analyze each student
    for (const student of students) {
      const studentName = (student.profile as any)?.full_name || "Unknown Student";
      const studentAvatar = (student.profile as any)?.avatar_url;
      const sectionName = (student.section as any)?.name || "Unknown Section";
      const gradeLevel = (student.section as any)?.grade_level || student.grade_level || "";

      // 1. Analyze grades for declining trend
      const studentSubmissions = (submissions || []).filter(s => s.student_id === student.id && s.status === "graded");
      const recentSubmissions = studentSubmissions.filter(s =>
        new Date(s.submitted_at!) >= thirtyDaysAgo
      );
      const olderSubmissions = studentSubmissions.filter(s =>
        new Date(s.submitted_at!) < thirtyDaysAgo && new Date(s.submitted_at!) >= sixtyDaysAgo
      );

      if (recentSubmissions.length >= 2 && olderSubmissions.length >= 2) {
        const recentAvg = calculateAverageScore(recentSubmissions);
        const olderAvg = calculateAverageScore(olderSubmissions);

        if (recentAvg < olderAvg - 15) {
          const severity = recentAvg < 60 ? 'critical' : recentAvg < 70 ? 'high' : 'medium';
          alerts.push({
            id: `grade_decline_${student.id}`,
            student_id: student.id,
            student_name: studentName,
            student_lrn: student.lrn || "",
            student_avatar: studentAvatar,
            section_id: student.section_id,
            section_name: sectionName,
            grade_level: gradeLevel,
            alert_type: 'declining_grades',
            severity,
            title: "Grade Decline Detected",
            description: `${studentName}'s average grade dropped from ${olderAvg.toFixed(1)}% to ${recentAvg.toFixed(1)}% in the past month.`,
            metrics: {
              current_value: recentAvg,
              previous_value: olderAvg,
              trend: 'down',
            },
            detected_at: now.toISOString(),
            recommended_actions: [
              "Schedule a one-on-one meeting with the student",
              "Review recent assignments for understanding gaps",
              "Consider offering tutoring or additional resources",
              "Contact parent/guardian if decline continues",
            ],
          });
        }
      }

      // 2. Check for failing risk
      if (recentSubmissions.length >= 3) {
        const recentAvg = calculateAverageScore(recentSubmissions);
        if (recentAvg < 65) {
          alerts.push({
            id: `failing_risk_${student.id}`,
            student_id: student.id,
            student_name: studentName,
            student_lrn: student.lrn || "",
            student_avatar: studentAvatar,
            section_id: student.section_id,
            section_name: sectionName,
            grade_level: gradeLevel,
            alert_type: 'failing_risk',
            severity: recentAvg < 50 ? 'critical' : 'high',
            title: "At Risk of Failing",
            description: `${studentName}'s current average is ${recentAvg.toFixed(1)}%, which puts them at risk of failing.`,
            metrics: {
              current_value: recentAvg,
              threshold: 65,
              trend: 'down',
            },
            detected_at: now.toISOString(),
            recommended_actions: [
              "Create an intervention plan immediately",
              "Identify specific topics needing remediation",
              "Schedule parent-teacher conference",
              "Consider peer tutoring or study groups",
            ],
          });
        }
      }

      // 3. Analyze attendance
      const studentAttendance = (attendanceData || []).filter(a => a.student_id === student.id);
      if (studentAttendance.length > 0) {
        const totalDays = studentAttendance.length;
        const presentDays = studentAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
        const attendanceRate = (presentDays / totalDays) * 100;

        if (attendanceRate < 85) {
          const severity = attendanceRate < 70 ? 'critical' : attendanceRate < 75 ? 'high' : 'medium';
          alerts.push({
            id: `attendance_${student.id}`,
            student_id: student.id,
            student_name: studentName,
            student_lrn: student.lrn || "",
            student_avatar: studentAvatar,
            section_id: student.section_id,
            section_name: sectionName,
            grade_level: gradeLevel,
            alert_type: 'attendance_drop',
            severity,
            title: "Low Attendance",
            description: `${studentName} has ${attendanceRate.toFixed(1)}% attendance rate in the past 30 days (${presentDays}/${totalDays} days).`,
            metrics: {
              current_value: attendanceRate,
              threshold: 85,
              trend: 'down',
            },
            detected_at: now.toISOString(),
            recommended_actions: [
              "Contact parent/guardian to discuss attendance",
              "Investigate reasons for absences",
              "Create attendance improvement plan",
              "Provide missed work and catch-up opportunities",
            ],
          });
        }
      }

      // 4. Check for missing submissions
      if (assessments && assessments.length > 0) {
        const submittedAssessmentIds = new Set(
          (submissions || [])
            .filter(s => s.student_id === student.id)
            .map(s => s.assessment_id)
        );

        const missingAssessments = assessments.filter(a => !submittedAssessmentIds.has(a.id));

        if (missingAssessments.length >= 2) {
          const coursesAffected = [...new Set(missingAssessments.map(a => (a.course as any)?.name).filter(Boolean))];
          alerts.push({
            id: `missing_${student.id}`,
            student_id: student.id,
            student_name: studentName,
            student_lrn: student.lrn || "",
            student_avatar: studentAvatar,
            section_id: student.section_id,
            section_name: sectionName,
            grade_level: gradeLevel,
            alert_type: 'missing_submissions',
            severity: missingAssessments.length >= 4 ? 'high' : 'medium',
            title: "Missing Assignments",
            description: `${studentName} has ${missingAssessments.length} missing assignments${coursesAffected.length > 0 ? ` in ${coursesAffected.join(", ")}` : ""}.`,
            metrics: {
              current_value: missingAssessments.length,
              threshold: 0,
            },
            detected_at: now.toISOString(),
            recommended_actions: [
              "Send reminder about missing assignments",
              "Offer deadline extensions if appropriate",
              "Check if student needs help with the material",
              "Document missing work for parent communication",
            ],
          });
        }
      }

      // 5. Check for low engagement
      const studentProgress = (progressData || []).filter(p => p.student_id === student.id);
      const recentActivity = studentProgress.filter(p =>
        new Date(p.last_accessed_at!) >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      );

      if (studentProgress.length > 0 && recentActivity.length === 0) {
        alerts.push({
          id: `engagement_${student.id}`,
          student_id: student.id,
          student_name: studentName,
          student_lrn: student.lrn || "",
          student_avatar: studentAvatar,
          section_id: student.section_id,
          section_name: sectionName,
          grade_level: gradeLevel,
          alert_type: 'low_engagement',
          severity: 'medium',
          title: "Low Course Engagement",
          description: `${studentName} hasn't accessed course materials in the past 2 weeks.`,
          metrics: {
            current_value: 0,
            threshold: 1,
          },
          detected_at: now.toISOString(),
          recommended_actions: [
            "Send encouragement message to the student",
            "Check if technical issues are preventing access",
            "Assign engaging activities to re-motivate",
            "Consider gamification or incentives",
          ],
        });
      }
    }

    // Filter by alert type if specified
    let filteredAlerts = alerts;
    if (alertType) {
      filteredAlerts = filteredAlerts.filter(a => a.alert_type === alertType);
    }

    // Filter by minimum severity
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const minSeverityIndex = severityOrder.indexOf(minSeverity);
    filteredAlerts = filteredAlerts.filter(a =>
      severityOrder.indexOf(a.severity) >= minSeverityIndex
    );

    // Sort by severity (critical first) then by student name
    filteredAlerts.sort((a, b) => {
      const severityDiff = severityOrder.indexOf(b.severity) - severityOrder.indexOf(a.severity);
      if (severityDiff !== 0) return severityDiff;
      return a.student_name.localeCompare(b.student_name);
    });

    // Get summary stats
    const summary = {
      total_alerts: filteredAlerts.length,
      critical: filteredAlerts.filter(a => a.severity === 'critical').length,
      high: filteredAlerts.filter(a => a.severity === 'high').length,
      medium: filteredAlerts.filter(a => a.severity === 'medium').length,
      low: filteredAlerts.filter(a => a.severity === 'low').length,
      by_type: {
        declining_grades: filteredAlerts.filter(a => a.alert_type === 'declining_grades').length,
        attendance_drop: filteredAlerts.filter(a => a.alert_type === 'attendance_drop').length,
        missing_submissions: filteredAlerts.filter(a => a.alert_type === 'missing_submissions').length,
        low_engagement: filteredAlerts.filter(a => a.alert_type === 'low_engagement').length,
        failing_risk: filteredAlerts.filter(a => a.alert_type === 'failing_risk').length,
      },
      students_at_risk: new Set(filteredAlerts.map(a => a.student_id)).size,
    };

    return NextResponse.json({
      success: true,
      alerts: filteredAlerts,
      summary,
      metadata: {
        generated_at: now.toISOString(),
        analysis_period: {
          start: thirtyDaysAgo.toISOString(),
          end: now.toISOString(),
        },
        sections_analyzed: targetSectionIds.length,
        students_analyzed: students.length,
      },
    });
  } catch (error) {
    console.error("Student alerts error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred analyzing student data" },
      { status: 500 }
    );
  }
}

// Helper function to calculate average score percentage
function calculateAverageScore(submissions: any[]): number {
  if (submissions.length === 0) return 0;

  let totalPercent = 0;
  let count = 0;

  for (const sub of submissions) {
    if (sub.score !== null && sub.assessment?.total_points) {
      totalPercent += (sub.score / sub.assessment.total_points) * 100;
      count++;
    }
  }

  return count > 0 ? totalPercent / count : 0;
}
