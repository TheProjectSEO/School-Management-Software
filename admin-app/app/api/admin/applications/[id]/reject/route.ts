import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendApplicantEmail } from "@/lib/notifications/email";
import { sendApplicantSms } from "@/lib/notifications/sms";

type RejectPayload = {
  adminProfileId?: string;
  reason?: string;
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const applicationId = params.id;
  const body = (await req.json().catch(() => ({}))) as RejectPayload;
  const supabase = createServiceClient();

  const { data: application } = await supabase
    .from("student_applications")
    .select("id, email, phone, first_name, last_name")
    .eq("id", applicationId)
    .maybeSingle();

  const { error } = await supabase
    .from("student_applications")
    .update({
      status: "rejected",
      rejection_reason: body.reason ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: body.adminProfileId ?? null,
    })
    .eq("id", applicationId);

  if (error) {
    console.error("reject application error", error);
    return NextResponse.json({ error: "Failed to reject application" }, { status: 500 });
  }

  await supabase.from("application_status_log").insert({
    application_id: applicationId,
    status: "rejected",
    note: body.reason ?? "Rejected",
    created_by: body.adminProfileId ?? null,
  });

  if (application) {
    const statusUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/apply/status`
      : undefined;
    await sendApplicantEmail("rejected", {
      to: application.email,
      name: `${application.first_name} ${application.last_name}`,
      applicationId,
      statusUrl,
      reason: body.reason,
    });
    if (application.phone) {
      await sendApplicantSms("rejected", { to: application.phone, statusUrl, reason: body.reason });
    }
  }

  return NextResponse.json({ success: true });
}
