type Template =
  | "received"
  | "pending_info"
  | "approved"
  | "rejected";

type EmailInput = {
  to: string;
  name?: string;
  applicationId: string;
  statusUrl?: string;
  tempPassword?: string;
  loginUrl?: string;
  schoolName?: string;
  requestedDocuments?: string[];
  reason?: string;
};

const RESEND_API = "https://api.resend.com/emails";

export async function sendApplicantEmail(template: Template, input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set; skipping send");
    return;
  }

  const subject = buildSubject(template, input);
  const body = buildBody(template, input);

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "admissions@msu.example.com",
      to: input.to,
      subject,
      html: body,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[email] send failed", res.status, text);
  }
}

function buildSubject(template: Template, input: EmailInput) {
  switch (template) {
    case "received":
      return `Application received (Ref: ${input.applicationId})`;
    case "pending_info":
      return `Action needed for your application`;
    case "approved":
      return `You’re approved!`;
    case "rejected":
      return `Update on your application`;
  }
}

function buildBody(template: Template, input: EmailInput) {
  const statusLink = input.statusUrl ?? "https://example.com/apply/status";
  const requestedDocs =
    input.requestedDocuments?.length
      ? `<ul>${input.requestedDocuments.map((d) => `<li>${d}</li>`).join("")}</ul>`
      : "";

  switch (template) {
    case "received":
      return `
        <p>Hi ${input.name || "there"},</p>
        <p>We received your application (Ref: ${input.applicationId}). We will review it shortly.</p>
        <p>You can check status here: <a href="${statusLink}">${statusLink}</a></p>
      `;
    case "pending_info":
      return `
        <p>Hi ${input.name || "there"},</p>
        <p>We need a few more documents to continue your application.</p>
        ${requestedDocs || "<p>Please provide the requested documents.</p>"}
        <p>Upload or reply as instructed. Status: <a href="${statusLink}">${statusLink}</a></p>
      `;
    case "approved":
      return `
        <p>Hi ${input.name || "there"},</p>
        <p>Congratulations! You have been approved.</p>
        <p>Login: ${input.loginUrl || "https://example.com/login"}</p>
        <p>Username: ${input.to}</p>
        <p>Temporary password: ${input.tempPassword || "(provided separately)"}</p>
        <p>Status: <a href="${statusLink}">${statusLink}</a></p>
      `;
    case "rejected":
      return `
        <p>Hi ${input.name || "there"},</p>
        <p>Thank you for applying. Unfortunately, we are unable to accept your application at this time.</p>
        ${input.reason ? `<p>Reason: ${input.reason}</p>` : ""}
        <p>You may reapply in the future.</p>
      `;
  }
}
