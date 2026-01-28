import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { callOpenAIChatCompletions } from "@/lib/ai/openai";

/**
 * GET /api/admin/finance/fee-collection-ai
 * AI-powered fee collection insights and recommendations
 *
 * NOW USES REAL DATA from:
 * - student_fee_accounts (balances, status)
 * - payment_schedules (due dates, overdue tracking)
 * - payments (payment history)
 * - student_guardians (contact info)
 *
 * Analyzes payment patterns to:
 * - Identify students at risk of missing payments
 * - Suggest optimal reminder timing
 * - Recommend payment plan options
 * - Generate personalized reminder messages
 *
 * POST /api/admin/finance/fee-collection-ai
 * Generate personalized reminder message for a specific student
 */

interface PaymentRiskStudent {
  id: string;
  student_id: string;
  student_name: string;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string;
  grade_level: string;
  section_name: string;
  total_balance: number;
  days_overdue: number;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_score: number;
  payment_history: PaymentHistoryItem[];
  suggested_action: string;
  recommended_plan?: string;
  last_payment_date: string | null;
  next_due_date: string | null;
  account_status: string;
}

interface PaymentHistoryItem {
  date: string;
  amount: number;
  status: "paid" | "partial" | "missed";
  method?: string;
}

interface CollectionSummary {
  total_students_with_balance: number;
  total_outstanding: number;
  critical_count: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  avg_days_overdue: number;
  collection_rate: number;
  total_collected_this_month: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minRiskLevel = searchParams.get("minRiskLevel") || "low";
    const gradeLevel = searchParams.get("gradeLevel");
    const schoolYearId = searchParams.get("schoolYearId");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    const supabase = createServiceClient();

    // Get current/active school year if not specified
    let activeSchoolYearId = schoolYearId;
    if (!activeSchoolYearId) {
      const { data: activeYear } = await supabase
        .from("school_years")
        .select("id")
        .eq("status", "active")
        .limit(1)
        .single();

      activeSchoolYearId = activeYear?.id;
    }

    // Fetch fee accounts with balances > 0 (students who owe money)
    let accountsQuery = supabase
      .from("student_fee_accounts")
      .select(
        `
        id,
        student_id,
        school_id,
        school_year_id,
        grade_level_at_assessment,
        total_assessed,
        total_paid,
        current_balance,
        days_overdue,
        oldest_overdue_date,
        status,
        student:students(
          id,
          lrn,
          grade_level,
          section:sections(id, name, grade_level),
          profile:school_profiles(id, full_name, phone)
        )
      `
      )
      .gt("current_balance", 0)
      .in("status", ["active", "on_hold"])
      .order("days_overdue", { ascending: false })
      .limit(200);

    if (activeSchoolYearId) {
      accountsQuery = accountsQuery.eq("school_year_id", activeSchoolYearId);
    }

    if (gradeLevel) {
      accountsQuery = accountsQuery.eq("grade_level_at_assessment", gradeLevel);
    }

    const { data: feeAccounts, error: accountsError } = await accountsQuery;

    if (accountsError) {
      console.error("Fee accounts query error:", accountsError);
      throw accountsError;
    }

    // If no fee accounts exist yet, return empty with helpful message
    if (!feeAccounts || feeAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        students: [],
        summary: {
          total_students_with_balance: 0,
          total_outstanding: 0,
          critical_count: 0,
          high_risk_count: 0,
          medium_risk_count: 0,
          low_risk_count: 0,
          avg_days_overdue: 0,
          collection_rate: 100,
          total_collected_this_month: 0,
        },
        metadata: {
          generated_at: new Date().toISOString(),
          currency: "PHP",
          data_source: "real",
          message:
            "No outstanding balances found. Either all students are fully paid or fee accounts haven't been set up yet.",
        },
      });
    }

    const accountIds = feeAccounts.map((a) => a.id);
    const studentIds = feeAccounts.map((a) => a.student_id);

    // Fetch payment history for these accounts
    const { data: payments } = await supabase
      .from("payments")
      .select("student_fee_account_id, amount, payment_date, status, payment_method")
      .in("student_fee_account_id", accountIds)
      .eq("status", "completed")
      .order("payment_date", { ascending: false })
      .limit(500);

    // Fetch upcoming/overdue payment schedules
    const { data: schedules } = await supabase
      .from("payment_schedules")
      .select("student_fee_account_id, due_date, amount_due, amount_paid, status")
      .in("student_fee_account_id", accountIds)
      .in("status", ["pending", "overdue", "partially_paid"])
      .order("due_date", { ascending: true });

    // Fetch guardians for contact info
    const { data: guardians } = await supabase
      .from("student_guardians")
      .select("student_id, guardian_name, guardian_email, guardian_phone, is_primary")
      .in("student_id", studentIds)
      .eq("financial_responsibility", true);

    // Group payments and schedules by account
    type PaymentType = NonNullable<typeof payments>[number];
    type ScheduleType = NonNullable<typeof schedules>[number];
    type GuardianType = NonNullable<typeof guardians>[number];

    const paymentsByAccount = new Map<string, PaymentType[]>();
    const schedulesByAccount = new Map<string, ScheduleType[]>();
    const guardiansByStudent = new Map<string, GuardianType>();

    payments?.forEach((p) => {
      const existing = paymentsByAccount.get(p.student_fee_account_id) || [];
      existing.push(p);
      paymentsByAccount.set(p.student_fee_account_id, existing);
    });

    schedules?.forEach((s) => {
      const existing = schedulesByAccount.get(s.student_fee_account_id) || [];
      existing.push(s);
      schedulesByAccount.set(s.student_fee_account_id, existing);
    });

    guardians?.forEach((g) => {
      // Prefer primary guardian
      const existing = guardiansByStudent.get(g.student_id);
      if (!existing || g.is_primary) {
        guardiansByStudent.set(g.student_id, g);
      }
    });

    // Process each account
    const atRiskStudents: PaymentRiskStudent[] = [];
    let totalOutstanding = 0;
    let totalOverdueDays = 0;
    let overdueCount = 0;

    for (const account of feeAccounts) {
      const balance = Number(account.current_balance);
      const daysOverdue = account.days_overdue || 0;

      totalOutstanding += balance;
      if (daysOverdue > 0) {
        totalOverdueDays += daysOverdue;
        overdueCount++;
      }

      // Get payment history for this account
      const accountPayments = paymentsByAccount.get(account.id) || [];
      const paymentHistory: PaymentHistoryItem[] = accountPayments
        .slice(0, 5)
        .map((p) => ({
          date: p.payment_date,
          amount: Number(p.amount),
          status: "paid" as const,
          method: p.payment_method,
        }));

      // Check for missed payments from schedules
      const accountSchedules = schedulesByAccount.get(account.id) || [];
      const overdueSchedules = accountSchedules.filter(
        (s) => s.status === "overdue"
      );

      overdueSchedules.forEach((s) => {
        paymentHistory.push({
          date: s.due_date,
          amount: Number(s.amount_due) - Number(s.amount_paid),
          status: Number(s.amount_paid) > 0 ? "partial" : "missed",
        });
      });

      // Calculate risk score based on REAL data
      let riskScore = 0;

      // Days overdue factor (up to 40 points)
      if (daysOverdue > 60) riskScore += 40;
      else if (daysOverdue > 30) riskScore += 30;
      else if (daysOverdue > 14) riskScore += 20;
      else if (daysOverdue > 0) riskScore += 10;

      // Balance amount factor (up to 30 points)
      if (balance > 30000) riskScore += 30;
      else if (balance > 20000) riskScore += 25;
      else if (balance > 15000) riskScore += 20;
      else if (balance > 10000) riskScore += 10;

      // Payment history factor (up to 20 points)
      const missedPayments = paymentHistory.filter(
        (p) => p.status === "missed"
      ).length;
      const partialPayments = paymentHistory.filter(
        (p) => p.status === "partial"
      ).length;
      riskScore += missedPayments * 8 + partialPayments * 4;

      // Account on hold factor (+10 points)
      if (account.status === "on_hold") {
        riskScore += 10;
      }

      riskScore = Math.min(100, riskScore);

      // Determine risk level
      let riskLevel: PaymentRiskStudent["risk_level"];
      if (riskScore >= 70) riskLevel = "critical";
      else if (riskScore >= 50) riskLevel = "high";
      else if (riskScore >= 25) riskLevel = "medium";
      else riskLevel = "low";

      // Filter by minimum risk level
      const riskLevelOrder = ["low", "medium", "high", "critical"];
      if (
        riskLevelOrder.indexOf(riskLevel) <
        riskLevelOrder.indexOf(minRiskLevel)
      ) {
        continue;
      }

      // Get guardian info
      const guardian = guardiansByStudent.get(account.student_id);

      // Get next due date from schedules
      const pendingSchedule = accountSchedules.find(
        (s) => s.status === "pending" || s.status === "partially_paid"
      );
      const nextDueDate = pendingSchedule?.due_date || null;

      // Get last payment date
      const lastPayment = accountPayments[0];
      const lastPaymentDate = lastPayment?.payment_date || null;

      // Generate suggested action
      const suggestedAction = getSuggestedAction(
        riskLevel,
        daysOverdue,
        balance,
        account.status
      );
      const recommendedPlan = getRecommendedPlan(balance, daysOverdue);

      const student = account.student as any;

      atRiskStudents.push({
        id: account.id,
        student_id: account.student_id,
        student_name: student?.profile?.full_name || "Unknown",
        guardian_name: guardian?.guardian_name || "Parent/Guardian",
        guardian_email: guardian?.guardian_email || "",
        guardian_phone: guardian?.guardian_phone || student?.profile?.phone || "",
        grade_level:
          student?.section?.grade_level ||
          account.grade_level_at_assessment ||
          "",
        section_name: student?.section?.name || "",
        total_balance: balance,
        days_overdue: daysOverdue,
        risk_level: riskLevel,
        risk_score: riskScore,
        payment_history: paymentHistory.slice(0, 5),
        suggested_action: suggestedAction,
        recommended_plan: recommendedPlan,
        last_payment_date: lastPaymentDate,
        next_due_date: nextDueDate,
        account_status: account.status,
      });
    }

    // Sort by risk score (highest first)
    atRiskStudents.sort((a, b) => b.risk_score - a.risk_score);

    // Limit results
    const limitedResults = atRiskStudents.slice(0, limit);

    // Calculate this month's collection
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "completed")
      .gte("payment_date", startOfMonth.toISOString().split("T")[0]);

    const totalCollectedThisMonth = (monthlyPayments || []).reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    // Calculate total students for collection rate
    const { count: totalStudents } = await supabase
      .from("student_fee_accounts")
      .select("*", { count: "exact", head: true })
      .eq("school_year_id", activeSchoolYearId || "");

    // Calculate summary
    const summary: CollectionSummary = {
      total_students_with_balance: atRiskStudents.length,
      total_outstanding: totalOutstanding,
      critical_count: atRiskStudents.filter((s) => s.risk_level === "critical")
        .length,
      high_risk_count: atRiskStudents.filter((s) => s.risk_level === "high")
        .length,
      medium_risk_count: atRiskStudents.filter((s) => s.risk_level === "medium")
        .length,
      low_risk_count: atRiskStudents.filter((s) => s.risk_level === "low")
        .length,
      avg_days_overdue:
        overdueCount > 0 ? Math.round(totalOverdueDays / overdueCount) : 0,
      collection_rate:
        totalStudents && totalStudents > 0
          ? Math.round(
              ((totalStudents - atRiskStudents.length) / totalStudents) * 100
            )
          : 100,
      total_collected_this_month: totalCollectedThisMonth,
    };

    return NextResponse.json({
      success: true,
      students: limitedResults,
      summary,
      metadata: {
        generated_at: new Date().toISOString(),
        currency: "PHP",
        data_source: "real",
        school_year_id: activeSchoolYearId,
      },
    });
  } catch (error) {
    console.error("Fee collection AI error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred analyzing fee collection data",
      },
      { status: 500 }
    );
  }
}

// POST: Generate personalized reminder message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      student_fee_account_id,
      student_name,
      guardian_name,
      balance,
      days_overdue,
      tone = "friendly",
      include_payment_link = true,
      save_reminder = false,
    } = body;

    // Validate required fields
    if (!student_name || !guardian_name || balance === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "student_name, guardian_name, and balance are required",
        },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a school finance assistant helping compose payment reminder messages to parents.

Guidelines:
- Be respectful and understanding
- Maintain professionalism while being warm
- Never be accusatory or threatening
- Offer help and payment options when appropriate
- Keep messages concise (2-3 short paragraphs)
- Use Philippine Peso (₱) for currency

Tone: ${tone}

Return JSON:
{
  "subject": "<email subject line>",
  "message": "<the reminder message>",
  "sms_version": "<short SMS version under 160 chars>"
}`;

    const userPrompt = `Generate a payment reminder for:
- Student: ${student_name}
- Parent/Guardian: ${guardian_name}
- Outstanding Balance: ₱${Number(balance).toLocaleString()}
- Days Overdue: ${days_overdue || 0}
${include_payment_link ? "- Include mention of online payment portal at student.klase.ph" : ""}

Make it ${tone} but professional.`;

    const completion = await callOpenAIChatCompletions({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { success: false, error: "AI did not return a response" },
        { status: 500 }
      );
    }

    let message;
    try {
      message = JSON.parse(content);
    } catch {
      message = {
        subject: "Payment Reminder",
        message: content,
        sms_version: content.substring(0, 160),
      };
    }

    // Optionally save the reminder to the database
    if (save_reminder && student_fee_account_id) {
      const supabase = createServiceClient();

      await supabase.from("payment_reminders").insert({
        student_fee_account_id,
        reminder_type: days_overdue > 0 ? `overdue_${days_overdue}_days` : "custom",
        sent_via: "email",
        subject: message.subject,
        message_content: message.message,
        ai_generated: true,
        ai_tone: tone,
        status: "pending", // Will be 'sent' when actually sent
      });
    }

    return NextResponse.json({
      success: true,
      reminder: message,
      metadata: {
        generated_at: new Date().toISOString(),
        tone,
        balance,
        days_overdue: days_overdue || 0,
        ai_generated: true,
      },
    });
  } catch (error) {
    console.error("Reminder generation error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred generating the reminder" },
      { status: 500 }
    );
  }
}

// Helper functions
function getSuggestedAction(
  riskLevel: string,
  daysOverdue: number,
  balance: number,
  accountStatus: string
): string {
  if (accountStatus === "on_hold") {
    return "Account on hold - Contact required to discuss payment arrangement";
  }

  if (riskLevel === "critical") {
    return "Immediate phone call to guardian + formal notice + consider payment plan";
  }
  if (riskLevel === "high") {
    return daysOverdue > 30
      ? "Send formal reminder + offer payment plan discussion"
      : "Personal email reminder with payment options";
  }
  if (riskLevel === "medium") {
    return "Send friendly email reminder with online payment link";
  }
  return "Include in standard monthly statement";
}

function getRecommendedPlan(
  balance: number,
  daysOverdue: number
): string | undefined {
  if (balance > 25000) {
    const monthly = Math.ceil(balance / 4);
    return `4 monthly installments of ₱${monthly.toLocaleString()}`;
  }
  if (balance > 15000) {
    const monthly = Math.ceil(balance / 3);
    return `3 monthly installments of ₱${monthly.toLocaleString()}`;
  }
  if (balance > 10000 && daysOverdue > 30) {
    const payment = Math.ceil(balance / 2);
    return `2 payments of ₱${payment.toLocaleString()}`;
  }
  return undefined;
}
