import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendApplicantEmail } from "@/lib/notifications/email";
import { sendApplicantSms } from "@/lib/notifications/sms";

type RequestInfoPayload = {
  adminProfileId?: string;
  requestedDocuments?: string[];
  note?: string;
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const applicationId = params.id;
  const body = (await req.json().catch(() => ({}))) as RequestInfoPayload;
  const supabase = createServiceClient();

  const { data: application } = await supabase
    .from("student_applications")
    .select("id, email, phone, first_name, last_name")
    .eq("id", applicationId)
    .maybeSingle();

  const { error } = await supabase
    .from("student_applications")
    .update({
      status: "pending_info",
      requested_documents: body.requestedDocuments ?? [],
      reviewed_at: new Date().toISOString(),
      reviewed_by: body.adminProfileId ?? null,
    })
    .eq("id", applicationId);

  if (error) {
    console.error("request-info application error", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }

  await supabase.from("application_status_log").insert({
    application_id: applicationId,
    status: "pending_info",
    note: body.note ?? "Requested additional information",
    created_by: body.adminProfileId ?? null,
  });

  if (application) {
    const statusUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/apply/status`
      : undefined;
    await sendApplicantEmail("pending_info", {
      to: application.email,
      name: `${application.first_name} ${application.last_name}`,
      applicationId,
      statusUrl,
      requestedDocuments: body.requestedDocuments ?? [],
    });
    if (application.phone) {
      await sendApplicantSms("pending_info", { to: application.phone, statusUrl });
    }
  }

  return NextResponse.json({ success: true });
}
