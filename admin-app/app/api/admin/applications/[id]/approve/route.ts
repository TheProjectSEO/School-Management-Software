import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendApplicantEmail } from "@/lib/notifications/email";
import { sendApplicantSms } from "@/lib/notifications/sms";

type ApprovePayload = {
  adminProfileId?: string;
  schoolId?: string;
  sectionId?: string | null;
  generateCredentials?: boolean;
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const applicationId = params.id;
  const body = (await req.json().catch(() => ({}))) as ApprovePayload;
  const supabase = createServiceClient();

  // Fetch application
  const { data: application, error: appError } = await supabase
    .from("student_applications")
    .select(
      "id, first_name, last_name, email, phone, applying_for_grade, school_id, qr_code_id"
    )
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const schoolId = body.schoolId ?? application.school_id ?? null;
  const tempPassword = generateTempPassword();

  // Create auth user
  const { data: authCreated, error: authError } = await supabase.auth.admin.createUser({
    email: application.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: `${application.first_name} ${application.last_name}` },
  });

  if (authError && !authError.message.includes("already registered")) {
    console.error("auth create user error", authError);
    return NextResponse.json({ error: "Failed to create auth user" }, { status: 500 });
  }

  const authUserId =
    authCreated?.user?.id ||
    (
      await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
        filter: `email.eq.${application.email}`,
      })
    ).data?.users?.[0]?.id;

  if (!authUserId) {
    return NextResponse.json({ error: "Unable to resolve auth user" }, { status: 500 });
  }

  // Create profile
  const { data: profile, error: profileError } = await supabase
    .from("school_profiles")
    .insert({
      auth_user_id: authUserId,
      full_name: `${application.first_name} ${application.last_name}`,
      phone: application.phone ?? null,
    })
    .select("id")
    .single();

  if (profileError || !profile) {
    console.error("profile insert error", profileError);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }

  // Create student
  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      profile_id: profile.id,
      school_id: schoolId,
      grade_level: application.applying_for_grade ?? null,
      section_id: body.sectionId ?? null,
    })
    .select("id, section_id, school_id")
    .single();

  if (studentError || !student) {
    console.error("student insert error", studentError);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }

  // Auto-enroll in section courses if section provided
  if (student.section_id) {
    const { data: sectionCourses } = await supabase
      .from("courses")
      .select("id")
      .eq("section_id", student.section_id);
    if (sectionCourses && sectionCourses.length > 0) {
      await supabase.from("enrollments").upsert(
        sectionCourses.map((c) => ({
          student_id: student.id,
          course_id: c.id,
          school_id: student.school_id,
        }))
      );
    }
  }

  const { error } = await supabase
    .from("student_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: body.adminProfileId ?? null,
      student_id: student.id,
    })
    .eq("id", applicationId);

  if (error) {
    console.error("approve application error", error);
    return NextResponse.json({ error: "Failed to approve application" }, { status: 500 });
  }

  await supabase.from("application_status_log").insert({
    application_id: applicationId,
    status: "approved",
    note: "Approved by admin",
    created_by: body.adminProfileId ?? null,
  });

  // Notify applicant
  const statusUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/apply/status`
    : undefined;
  await sendApplicantEmail("approved", {
    to: application.email,
    name: `${application.first_name} ${application.last_name}`,
    applicationId,
    tempPassword,
    loginUrl: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
      : undefined,
    statusUrl,
  });
  if (application.phone) {
    await sendApplicantSms("approved", { to: application.phone, statusUrl });
  }

  return NextResponse.json({ success: true, studentId: student.id, tempPassword });
}

function generateTempPassword() {
  return `MSU-${Math.random().toString(36).slice(-8)}!`;
}
