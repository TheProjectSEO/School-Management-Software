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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: applicationId } = await params;
  const body = (await req.json().catch(() => ({}))) as ApprovePayload;
  
  // Validate service role key is configured
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    return NextResponse.json({ 
      error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing. Please check your .env.local file." 
    }, { status: 500 });
  }
  
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

  // Get or create default school if school_id is not provided
  let schoolId = body.schoolId ?? application.school_id ?? null;
  if (!schoolId) {
    // Try to get the first school
    const { data: schools, error: schoolError } = await supabase
      .from("schools")
      .select("id")
      .limit(1)
      .single();
    
    if (schools) {
      schoolId = schools.id;
    } else if (!schoolError || schoolError.code === 'PGRST116') {
      // No schools found, create a default one
      const { data: newSchool, error: createSchoolError } = await supabase
        .from("schools")
        .insert({
          slug: 'msu-main',
          name: 'Mindanao State University - Main Campus',
          region: 'Region XII',
          division: 'MSU System',
          accent_color: '#7B1113'
        })
        .select("id")
        .single();
      
      if (createSchoolError || !newSchool) {
        console.error("Failed to create default school:", createSchoolError);
        return NextResponse.json({ 
          error: "No school configured. Please create a school first or specify schoolId in the request." 
        }, { status: 500 });
      }
      schoolId = newSchool.id;
    } else {
      console.error("Error fetching schools:", schoolError);
      return NextResponse.json({ 
        error: "Failed to fetch school information. Please ensure at least one school exists." 
      }, { status: 500 });
    }
  }

  const tempPassword = generateTempPassword();

  // Create auth user
  let authCreated = null;
  let authError = null;
  
  try {
    const result = await supabase.auth.admin.createUser({
      email: application.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: `${application.first_name} ${application.last_name}` },
    });
    authCreated = result.data;
    authError = result.error;
  } catch (err: any) {
    authError = err;
    console.error("auth create user exception:", err);
  }

  // If user already exists, that's okay - we'll find them
  const isEmailExistsError = authError && (
    authError.code === 'email_exists' ||
    authError.message?.includes("already registered") ||
    authError.message?.includes("already exists")
  );

  if (authError && !isEmailExistsError) {
    console.error("auth create user error:", authError);
    return NextResponse.json({ 
      error: `Failed to create auth user: ${authError.message || "Unknown error"}. Please check SUPABASE_SERVICE_ROLE_KEY is configured correctly.` 
    }, { status: 500 });
  }
  let authUserId = authCreated?.user?.id;
  
  if (!authUserId) {
    // User already exists, try to find them
    const { data: existingUsers } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    const existingUser = existingUsers?.users?.find(u => u.email === application.email);
    authUserId = existingUser?.id;
  }

  if (!authUserId) {
    console.error("Unable to resolve auth user for email:", application.email);
    return NextResponse.json({ 
      error: `Unable to create or find auth user. Error: ${authError?.message || 'Unknown error'}` 
    }, { status: 500 });
  }

  // Check if profile already exists for this auth user
  let profile = null;
  const { data: existingProfile } = await supabase
    .from("school_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existingProfile) {
    profile = existingProfile;
  } else {
    // Create profile if it doesn't exist
    const { data: newProfile, error: profileError } = await supabase
      .from("school_profiles")
      .insert({
        auth_user_id: authUserId,
        full_name: `${application.first_name} ${application.last_name}`,
        phone: application.phone ?? null,
      })
      .select("id")
      .single();

    if (profileError || !newProfile) {
      console.error("profile insert error", profileError);
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }
    profile = newProfile;
  }

  // Check if student already exists for this profile
  const { data: existingStudent } = await supabase
    .from("students")
    .select("id, section_id, school_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  let student = null;
  if (existingStudent) {
    student = existingStudent;
    // Update school_id if it was null
    if (!student.school_id && schoolId) {
      const { error: updateError } = await supabase
        .from("students")
        .update({ school_id: schoolId })
        .eq("id", student.id);
      if (updateError) {
        console.error("Error updating student school_id:", updateError);
      } else {
        student.school_id = schoolId;
      }
    }
    // Update section_id if provided and currently null
    if (!student.section_id && body.sectionId) {
      const { error: sectionUpdateError } = await supabase
        .from("students")
        .update({ section_id: body.sectionId })
        .eq("id", student.id);
      if (sectionUpdateError) {
        console.error("Error updating student section_id:", sectionUpdateError);
      } else {
        student.section_id = body.sectionId;
      }
    }
  } else {
    // Create student if it doesn't exist
    const { data: newStudent, error: studentError } = await supabase
      .from("students")
      .insert({
        profile_id: profile.id,
        school_id: schoolId,
        grade_level: application.applying_for_grade ?? null,
        section_id: body.sectionId ?? null,
      })
      .select("id, section_id, school_id")
      .single();

    if (studentError || !newStudent) {
      console.error("student insert error", studentError);
      return NextResponse.json({ error: `Failed to create student: ${studentError?.message || "Unknown error"}` }, { status: 500 });
    }
    student = newStudent;
  }

  // Auto-enroll in section courses if section provided
  if (student.section_id) {
    const { data: sectionCourses, error: coursesError } = await supabase
      .from("courses")
      .select("id")
      .eq("section_id", student.section_id);
    
    if (coursesError) {
      console.error("Error fetching section courses:", coursesError);
    } else if (sectionCourses && sectionCourses.length > 0) {
      const enrollmentsToCreate = sectionCourses.map((c) => ({
        student_id: student.id,
        course_id: c.id,
        school_id: student.school_id,
        section_id: student.section_id,
        status: "active",
        enrolled_at: new Date().toISOString(),
      }));
      
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .upsert(enrollmentsToCreate, {
          onConflict: "student_id,course_id",
        })
        .select("id");
      
      if (enrollError) {
        console.error("Error creating enrollments:", enrollError);
      } else {
        console.log(`Created ${enrollments?.length || 0} enrollments for student ${student.id}`);
      }
    } else {
      console.log(`No courses found for section ${student.section_id}`);
    }
  } else {
    console.log(`No section_id provided for student ${student.id}, skipping auto-enrollment`);
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
