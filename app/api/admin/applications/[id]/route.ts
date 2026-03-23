import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI('users:read');
    if (!auth.success) return auth.response;

    const { id: applicationId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("student_applications")
      .select(
        `
        id, first_name, last_name, middle_name, email, phone, address,
        birth_date, gender, guardian_name, guardian_phone, guardian_email, guardian_relation,
        previous_school, last_grade_completed, applying_for_grade, preferred_track, gpa,
        status, rejection_reason, requested_documents, admin_notes, submitted_at, reviewed_at,
        qr_code_id, student_id
        `
      )
      .eq("id", applicationId)
      .single();

    if (error || !data) {
      console.error("admin application detail error", error);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: documents } = await supabase
      .from("application_documents")
      .select("id, document_type, file_name, mime_type, storage_path, verified, rejection_reason, uploaded_at")
      .eq("application_id", applicationId)
      .order("uploaded_at", { ascending: false });

    return NextResponse.json({ application: data, documents: documents ?? [] });
  } catch (error) {
    console.error("Error in GET /api/admin/applications/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
