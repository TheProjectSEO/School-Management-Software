type SmsTemplate = "pending_info" | "approved" | "rejected";

type SmsInput = {
  to: string;
  statusUrl?: string;
  reason?: string;
};

export async function sendApplicantSms(template: SmsTemplate, input: SmsInput) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    console.warn("[sms] Twilio env vars not set; skipping SMS");
    return;
  }

  const body = buildBody(template, input);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: input.to,
      From: from,
      Body: body,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[sms] send failed", res.status, text);
  }
}

function buildBody(template: SmsTemplate, input: SmsInput) {
  const statusLink = input.statusUrl || "https://example.com/apply/status";
  switch (template) {
    case "pending_info":
      return `Your application needs documents. Check: ${statusLink}`;
    case "approved":
      return `Approved! Check email for login details. Status: ${statusLink}`;
    case "rejected":
      return `Application not approved.${input.reason ? " Reason: " + input.reason : ""}`;
  }
}
