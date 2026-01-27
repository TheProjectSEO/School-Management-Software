import { NextRequest, NextResponse } from "next/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";
import { callOpenAIChatCompletions } from "@/lib/ai/openai";
import { getReportCard } from "@/lib/dal/report-cards";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/teacher/ai/generate-progress-report
 * Generate AI-written personalized progress narrative for a student
 *
 * Tables used:
 * - report_cards (read): Get student grades, GPA, attendance
 * - students (read): Get student info
 * - student_progress (read): Get module completion data
 * - submissions (read): Get assessment performance
 *
 * Returns AI-generated narrative - teacher reviews and edits before saving.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { reportCardId, studentId, gradingPeriodId, subject, tone = "professional" } = body;

    // Need either reportCardId OR (studentId + gradingPeriodId)
    if (!reportCardId && (!studentId || !gradingPeriodId)) {
      return NextResponse.json(
        { success: false, error: "Either reportCardId or (studentId + gradingPeriodId) is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get report card data
    let reportCard;
    if (reportCardId) {
      reportCard = await getReportCard(reportCardId);
    } else {
      // Fetch report card by student and grading period
      const { data } = await supabase
        .from("report_cards")
        .select("id")
        .eq("student_id", studentId)
        .eq("grading_period_id", gradingPeriodId)
        .maybeSingle();

      if (data?.id) {
        reportCard = await getReportCard(data.id);
      }
    }

    if (!reportCard) {
      return NextResponse.json(
        { success: false, error: "Report card not found" },
        { status: 404 }
      );
    }

    // Get additional student progress data
    const { data: progressData } = await supabase
      .from("student_progress")
      .select(`
        progress_percent,
        completed_at,
        lesson:lessons(
          title,
          module:modules(title, course:courses(name))
        )
      `)
      .eq("student_id", reportCard.student_id)
      .order("completed_at", { ascending: false })
      .limit(20);

    // Get recent submission performance
    const { data: submissions } = await supabase
      .from("submissions")
      .select(`
        score,
        submitted_at,
        status,
        assessment:assessments(
          title,
          total_points,
          type,
          course:courses(name)
        )
      `)
      .eq("student_id", reportCard.student_id)
      .eq("status", "graded")
      .order("submitted_at", { ascending: false })
      .limit(15);

    // Build context for AI
    const studentContext = buildStudentContext({
      reportCard,
      progressData: progressData || [],
      submissions: submissions || [],
      subject,
    });

    // Generate the prompt based on tone
    const systemPrompt = buildSystemPrompt(tone);
    const userPrompt = buildUserPrompt(studentContext, subject);

    // Call OpenAI
    const completion = await callOpenAIChatCompletions({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7, // Higher for more creative writing
      max_tokens: 1500,
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { success: false, error: "AI did not return a response" },
        { status: 500 }
      );
    }

    // Parse structured response
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      // If not JSON, treat as plain text narrative
      result = {
        narrative: content,
        summary: null,
        strengths: [],
        areas_for_growth: [],
        recommendations: [],
      };
    }

    return NextResponse.json({
      success: true,
      report: {
        narrative: result.narrative || content,
        summary: result.summary || null,
        strengths: result.strengths || [],
        areas_for_growth: result.areas_for_growth || [],
        recommendations: result.recommendations || [],
      },
      metadata: {
        student_name: reportCard.student_info?.full_name,
        grading_period: reportCard.grading_period?.name,
        subject: subject || "All Subjects",
        tone,
        generated_at: new Date().toISOString(),
      },
      message: "Progress report generated. Please review and edit before saving as teacher remarks.",
    });
  } catch (error) {
    console.error("AI progress report error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred generating the progress report" },
      { status: 500 }
    );
  }
}

interface StudentContext {
  studentName: string;
  gradeLevel: string;
  sectionName: string;
  gradingPeriod: string;
  grades: Array<{
    subject: string;
    grade: number;
    remarks?: string;
  }>;
  gpa: {
    termGPA: number;
    standing: string;
  };
  attendance: {
    rate: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalDays: number;
  };
  recentProgress: Array<{
    lesson: string;
    module: string;
    course: string;
    completed: boolean;
    progress: number;
  }>;
  assessmentPerformance: Array<{
    assessment: string;
    course: string;
    type: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
  subjectFocus?: string;
}

function buildStudentContext(params: {
  reportCard: NonNullable<Awaited<ReturnType<typeof getReportCard>>>;
  progressData: any[];
  submissions: any[];
  subject?: string;
}): StudentContext {
  const { reportCard, progressData, submissions, subject } = params;

  // Filter grades by subject if specified
  let grades = reportCard.grades || [];
  if (subject) {
    grades = grades.filter(g =>
      g.subject_name?.toLowerCase().includes(subject.toLowerCase()) ||
      g.subject_code?.toLowerCase().includes(subject.toLowerCase())
    );
  }

  return {
    studentName: reportCard.student_info?.full_name || "Student",
    gradeLevel: reportCard.student_info?.grade_level || "",
    sectionName: reportCard.student_info?.section_name || "",
    gradingPeriod: reportCard.grading_period?.name || "",
    grades: grades.map(g => ({
      subject: g.subject_name || g.subject_code || "Unknown",
      grade: g.final_grade || g.grade || 0,
      remarks: g.remarks,
    })),
    gpa: {
      termGPA: reportCard.gpa?.term_gpa || 0,
      standing: reportCard.gpa?.academic_standing || "unknown",
    },
    attendance: {
      rate: reportCard.attendance?.attendance_rate || 0,
      presentDays: reportCard.attendance?.present_days || 0,
      absentDays: reportCard.attendance?.absent_days || 0,
      lateDays: reportCard.attendance?.late_days || 0,
      totalDays: reportCard.attendance?.total_days || 0,
    },
    recentProgress: (progressData || []).slice(0, 10).map((p: any) => ({
      lesson: p.lesson?.title || "Unknown Lesson",
      module: p.lesson?.module?.title || "Unknown Module",
      course: p.lesson?.module?.course?.name || "Unknown Course",
      completed: p.progress_percent >= 100,
      progress: p.progress_percent || 0,
    })),
    assessmentPerformance: (submissions || []).slice(0, 10).map((s: any) => ({
      assessment: s.assessment?.title || "Unknown Assessment",
      course: s.assessment?.course?.name || "Unknown Course",
      type: s.assessment?.type || "quiz",
      score: s.score || 0,
      maxScore: s.assessment?.total_points || 100,
      percentage: s.assessment?.total_points
        ? Math.round((s.score / s.assessment.total_points) * 100)
        : 0,
    })),
    subjectFocus: subject,
  };
}

function buildSystemPrompt(tone: string): string {
  const toneGuide = {
    professional: "formal and objective, suitable for official records",
    encouraging: "warm and supportive while maintaining professionalism",
    constructive: "focused on growth opportunities while acknowledging achievements",
    detailed: "comprehensive and thorough, covering all aspects of performance",
  }[tone] || "professional and balanced";

  return `You are an experienced K-12 teacher writing progress reports for students.
Your writing should be ${toneGuide}.

Guidelines:
- Use the student's name naturally throughout
- Be specific about achievements and areas for improvement
- Avoid generic statements - reference actual performance data
- Keep paragraphs concise but meaningful
- Balance positive feedback with constructive suggestions
- End with an encouraging note about future potential

Return your response as JSON with this structure:
{
  "narrative": "<2-3 paragraph progress report narrative>",
  "summary": "<1 sentence executive summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areas_for_growth": ["<area 1>", "<area 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}`;
}

function buildUserPrompt(context: StudentContext, subject?: string): string {
  const parts: string[] = [];

  parts.push(`Write a progress report for ${context.studentName}, a ${context.gradeLevel} student in ${context.sectionName}.`);
  parts.push(`Grading Period: ${context.gradingPeriod}`);

  if (subject) {
    parts.push(`\nFocus specifically on: ${subject}`);
  }

  // Grades section
  if (context.grades.length > 0) {
    parts.push("\n\nACademIC PERFORMANCE:");
    context.grades.forEach(g => {
      parts.push(`- ${g.subject}: ${g.grade}%${g.remarks ? ` (${g.remarks})` : ""}`);
    });
    parts.push(`\nOverall GPA: ${context.gpa.termGPA.toFixed(2)} (${context.gpa.standing.replace(/_/g, " ")})`);
  }

  // Attendance
  parts.push("\n\nATTENDANCE:");
  parts.push(`- Attendance Rate: ${context.attendance.rate}%`);
  parts.push(`- Present: ${context.attendance.presentDays}/${context.attendance.totalDays} days`);
  if (context.attendance.lateDays > 0) {
    parts.push(`- Late: ${context.attendance.lateDays} days`);
  }
  if (context.attendance.absentDays > 0) {
    parts.push(`- Absent: ${context.attendance.absentDays} days`);
  }

  // Recent progress
  if (context.recentProgress.length > 0) {
    parts.push("\n\nRECENT LEARNING PROGRESS:");
    const completed = context.recentProgress.filter(p => p.completed);
    const inProgress = context.recentProgress.filter(p => !p.completed);

    if (completed.length > 0) {
      parts.push(`Completed ${completed.length} lessons including:`);
      completed.slice(0, 3).forEach(p => {
        parts.push(`- ${p.lesson} (${p.course})`);
      });
    }

    if (inProgress.length > 0) {
      parts.push(`Currently working on ${inProgress.length} lessons.`);
    }
  }

  // Assessment performance
  if (context.assessmentPerformance.length > 0) {
    parts.push("\n\nASSESSMENT PERFORMANCE:");
    const avgScore = context.assessmentPerformance.reduce((sum, a) => sum + a.percentage, 0) / context.assessmentPerformance.length;
    parts.push(`Average assessment score: ${avgScore.toFixed(1)}%`);

    // Top and struggling assessments
    const sorted = [...context.assessmentPerformance].sort((a, b) => b.percentage - a.percentage);
    if (sorted.length > 0 && sorted[0].percentage >= 80) {
      parts.push(`Strong performance on: ${sorted[0].assessment} (${sorted[0].percentage}%)`);
    }
    if (sorted.length > 0 && sorted[sorted.length - 1].percentage < 70) {
      parts.push(`Needs improvement on: ${sorted[sorted.length - 1].assessment} (${sorted[sorted.length - 1].percentage}%)`);
    }
  }

  parts.push("\n\nPlease write a personalized progress report based on this data.");

  return parts.join("\n");
}
