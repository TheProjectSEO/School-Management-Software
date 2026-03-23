import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/utils/rateLimit";

/** Derive a per-application upload token using HMAC-SHA256 (no DB column needed) */
function makeUploadToken(applicationId: string): string {
  const secret = process.env.JWT_SECRET || "fallback-secret";
  return createHmac("sha256", secret).update(`upload:${applicationId}`).digest("hex");
}

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

// POST /api/applications - Public endpoint for submitting applications
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 submissions per hour per IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(`applications:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

    const body = (await req.json()) as ApplicationPayload;

    if (!body.firstName || !body.lastName || !body.email || !body.applyingForGrade) {
      return NextResponse.json(
        { error: "firstName, lastName, email, applyingForGrade are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Resolve QR code: the URL passes the code text (e.g. "MSU-2026-GEN"), not the UUID
    let resolvedQrId: string | null = null;
    let resolvedSchoolId: string | null = body.schoolId ?? null;

    if (body.qrCodeId) {
      // Try as UUID first (direct id), then as code text
      const { data: qrByCode } = await supabase
        .from("enrollment_qr_codes")
        .select("id, school_id")
        .or(`id.eq.${body.qrCodeId},code.eq.${body.qrCodeId}`)
        .limit(1)
        .maybeSingle();

      if (qrByCode) {
        resolvedQrId = qrByCode.id;
        if (!resolvedSchoolId) resolvedSchoolId = qrByCode.school_id;
      }
      // If QR code not found, just skip it — don't block the application
    }

    const { data, error } = await supabase
      .from("student_applications")
      .insert({
        school_id: resolvedSchoolId,
        qr_code_id: resolvedQrId,
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
        how_did_you_hear: body.howDidYouHear ?? null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        requested_documents: [],
        admin_notes: null,
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null,
        user_agent: req.headers.get("user-agent"),
      })
      .select("id, status, submitted_at")
      .single();

    if (error) {
      console.error("Error inserting application", error);
      return NextResponse.json(
        { error: "Failed to create application", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      applicationId: data.id,
      status: data.status,
      submittedAt: data.submitted_at,
      uploadToken: makeUploadToken(data.id),
    });
  } catch (err) {
    console.error("POST /api/applications error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/applications - Check application status by id only (email lookup removed to prevent enumeration)
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const query = supabase
      .from("student_applications")
      .select(
        "id, status, submitted_at, updated_at, requested_documents, rejection_reason, applying_for_grade, preferred_track, qr_code_id"
      )
      .eq("id", id);

    const { data, error } = await query.maybeSingle();

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
