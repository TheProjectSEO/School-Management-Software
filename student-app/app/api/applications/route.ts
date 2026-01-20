import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type ApplicationPayload = {
  schoolId?: string;
  qrCodeId?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  gender?: "male" | "female" | "other";
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianRelation?: string;
  previousSchool?: string;
  lastGradeCompleted?: string;
  applyingForGrade: string;
  preferredTrack?: string;
  gpa?: number;
  howDidYouHear?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ApplicationPayload;
    if (!body.firstName || !body.lastName || !body.email || !body.applyingForGrade) {
      return NextResponse.json(
        { error: "firstName, lastName, email, applyingForGrade are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("student_applications")
      .insert({
        school_id: body.schoolId ?? null,
        qr_code_id: body.qrCodeId ?? null,
        first_name: body.firstName,
        last_name: body.lastName,
        middle_name: body.middleName ?? null,
        email: body.email,
        phone: body.phone ?? null,
        address: body.address ?? null,
        birth_date: body.birthDate ?? null,
        gender: body.gender ?? null,
        guardian_name: body.guardianName ?? null,
        guardian_phone: body.guardianPhone ?? null,
        guardian_email: body.guardianEmail ?? null,
        guardian_relation: body.guardianRelation ?? null,
        previous_school: body.previousSchool ?? null,
        last_grade_completed: body.lastGradeCompleted ?? null,
        applying_for_grade: body.applyingForGrade,
        preferred_track: body.preferredTrack ?? null,
        gpa: body.gpa ?? null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        requested_documents: [],
        admin_notes: null,
        ip_address: req.ip ?? null,
        user_agent: req.headers.get("user-agent"),
      })
      .select("id, status, submitted_at")
      .single();

    if (error) {
      console.error("Error inserting application", error);
      return NextResponse.json(
        { error: "Failed to create application", details: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ applicationId: data.id, status: data.status, submittedAt: data.submitted_at });
  } catch (err) {
    console.error("POST /api/applications error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Basic status lookup by application id or email
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const email = searchParams.get("email");

  if (!id && !email) {
    return NextResponse.json({ error: "id or email is required" }, { status: 400 });
  }

  try {
    const query = supabase
      .from("student_applications")
      .select(
        "id, status, submitted_at, updated_at, requested_documents, rejection_reason, applying_for_grade, preferred_track, qr_code_id"
      )
      .order("submitted_at", { ascending: false });

    if (id) {
      query.eq("id", id);
    } else if (email) {
      query.eq("email", email);
    }

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) {
      console.error("Error fetching application status", error);
      return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ application: data });
  } catch (err) {
    console.error("GET /api/applications error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
