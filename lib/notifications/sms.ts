/**
 * SMS notification helpers
 *
 * These are stub implementations that log to console.
 * Replace with actual SMS service integration (e.g., Twilio, AWS SNS, Semaphore)
 * when SMS service is configured.
 */

interface ApplicantSmsOptions {
  to: string;
  statusUrl?: string;
  reason?: string;
}

/**
 * Generic send applicant SMS function
 * Used by admin API routes for sending SMS notifications to applicants
 * Supports two signatures:
 * 1. sendApplicantSms(status, options) - for application status notifications
 * 2. sendApplicantSms(phone, message, options) - for generic SMS
 */
export async function sendApplicantSms(
  statusOrPhone: string,
  optionsOrMessage: ApplicantSmsOptions | string,
  options?: { applicantName?: string }
): Promise<{ success: boolean; message: string }> {
  // Check if using new signature (status, options)
  if (typeof optionsOrMessage === 'object') {
    const status = statusOrPhone;
    const opts = optionsOrMessage;

    console.log('[SMS STUB] Sending applicant notification SMS:');
    console.log(`  Status: ${status}`);
    console.log(`  To: ${opts.to}`);
    if (opts.statusUrl) console.log(`  Status URL: ${opts.statusUrl}`);
    if (opts.reason) console.log(`  Reason: ${opts.reason}`);

    return {
      success: true,
      message: `[STUB] ${status} SMS would be sent to ${opts.to}`,
    };
  }

  // Original signature (phone, message, options)
  const phone = statusOrPhone;
  const message = optionsOrMessage as string;

  console.log('[SMS STUB] Sending applicant SMS:');
  console.log(`  Phone: ${phone}`);
  console.log(`  Message: ${message}`);
  if (options?.applicantName) {
    console.log(`  Applicant: ${options.applicantName}`);
  }

  return {
    success: true,
    message: `[STUB] SMS would be sent to ${phone}`,
  };
}

/**
 * Send SMS notification when an application is approved
 */
export async function sendApplicationApprovedSMS(
  phone: string,
  applicantName: string
): Promise<{ success: boolean; message: string }> {
  console.log('[SMS STUB] Sending application approved SMS:');
  console.log(`  Phone: ${phone}`);
  console.log(`  Applicant: ${applicantName}`);
  console.log(`  Message: Congratulations ${applicantName}! Your application has been approved.`);

  // TODO: Implement actual SMS sending
  // Example with Twilio:
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({
  //   body: `Congratulations ${applicantName}! Your application has been approved. Please check your email for next steps.`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: phone,
  // });

  return {
    success: true,
    message: `[STUB] Application approved SMS would be sent to ${phone}`,
  };
}

/**
 * Send SMS notification when an application is rejected
 */
export async function sendApplicationRejectedSMS(
  phone: string,
  applicantName: string
): Promise<{ success: boolean; message: string }> {
  console.log('[SMS STUB] Sending application rejected SMS:');
  console.log(`  Phone: ${phone}`);
  console.log(`  Applicant: ${applicantName}`);
  console.log(`  Message: Dear ${applicantName}, your application status has been updated. Please check your email for details.`);

  // TODO: Implement actual SMS sending
  // Example with Twilio:
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({
  //   body: `Dear ${applicantName}, your application status has been updated. Please check your email for details.`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: phone,
  // });

  return {
    success: true,
    message: `[STUB] Application rejected SMS would be sent to ${phone}`,
  };
}

/**
 * Send SMS notification when additional information is requested
 */
export async function sendInfoRequestSMS(
  phone: string,
  applicantName: string
): Promise<{ success: boolean; message: string }> {
  console.log('[SMS STUB] Sending info request SMS:');
  console.log(`  Phone: ${phone}`);
  console.log(`  Applicant: ${applicantName}`);
  console.log(`  Message: Dear ${applicantName}, additional information is needed for your application. Please check your email.`);

  // TODO: Implement actual SMS sending
  // Example with Twilio:
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({
  //   body: `Dear ${applicantName}, additional information is needed for your application. Please check your email for details.`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: phone,
  // });

  return {
    success: true,
    message: `[STUB] Info request SMS would be sent to ${phone}`,
  };
}
