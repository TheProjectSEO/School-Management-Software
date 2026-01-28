/**
 * Email notification helpers
 *
 * These are stub implementations that log to console.
 * Replace with actual email service integration (e.g., SendGrid, Resend, AWS SES)
 * when email service is configured.
 */

interface ApplicantEmailOptions {
  to: string;
  name?: string;
  applicationId?: string;
  tempPassword?: string;
  loginUrl?: string;
  statusUrl?: string;
  reason?: string;
  requestedDocuments?: string[];
}

/**
 * Generic send applicant email function
 * Used by admin API routes for sending notifications to applicants
 * Supports two signatures:
 * 1. sendApplicantEmail(status, options) - for application status notifications
 * 2. sendApplicantEmail(to, subject, body, options) - for generic emails
 */
export async function sendApplicantEmail(
  statusOrTo: string,
  optionsOrSubject: ApplicantEmailOptions | string,
  body?: string,
  options?: { applicantName?: string }
): Promise<{ success: boolean; message: string }> {
  // Check if using new signature (status, options)
  if (typeof optionsOrSubject === 'object') {
    const status = statusOrTo;
    const opts = optionsOrSubject;

    console.log('[EMAIL STUB] Sending applicant notification email:');
    console.log(`  Status: ${status}`);
    console.log(`  To: ${opts.to}`);
    console.log(`  Name: ${opts.name || 'N/A'}`);
    if (opts.applicationId) console.log(`  Application ID: ${opts.applicationId}`);
    if (opts.tempPassword) console.log(`  Temp Password: [REDACTED]`);
    if (opts.loginUrl) console.log(`  Login URL: ${opts.loginUrl}`);
    if (opts.statusUrl) console.log(`  Status URL: ${opts.statusUrl}`);
    if (opts.reason) console.log(`  Reason: ${opts.reason}`);

    return {
      success: true,
      message: `[STUB] ${status} email would be sent to ${opts.to}`,
    };
  }

  // Original signature (to, subject, body, options)
  const to = statusOrTo;
  const subject = optionsOrSubject as string;

  console.log('[EMAIL STUB] Sending applicant email:');
  console.log(`  To: ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Body: ${body}`);
  if (options?.applicantName) {
    console.log(`  Applicant: ${options.applicantName}`);
  }

  return {
    success: true,
    message: `[STUB] Email would be sent to ${to}`,
  };
}

interface ApplicationApprovedDetails {
  applicationId?: string;
  studentName?: string;
  gradeLevel?: string;
  schoolYear?: string;
  enrollmentDate?: string;
  nextSteps?: string;
}

interface InfoRequestDetails {
  requestId?: string;
  missingDocuments?: string[];
  additionalInfo?: string;
  deadline?: string;
}

/**
 * Send email notification when an application is approved
 */
export async function sendApplicationApprovedEmail(
  to: string,
  applicantName: string,
  details: ApplicationApprovedDetails
): Promise<{ success: boolean; message: string }> {
  console.log('[EMAIL STUB] Sending application approved email:');
  console.log(`  To: ${to}`);
  console.log(`  Applicant: ${applicantName}`);
  console.log(`  Details:`, JSON.stringify(details, null, 2));

  // TODO: Implement actual email sending
  // Example with a service like Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'noreply@school.edu',
  //   to,
  //   subject: 'Application Approved',
  //   html: generateApprovedEmailTemplate(applicantName, details),
  // });

  return {
    success: true,
    message: `[STUB] Application approved email would be sent to ${to}`,
  };
}

/**
 * Send email notification when an application is rejected
 */
export async function sendApplicationRejectedEmail(
  to: string,
  applicantName: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  console.log('[EMAIL STUB] Sending application rejected email:');
  console.log(`  To: ${to}`);
  console.log(`  Applicant: ${applicantName}`);
  console.log(`  Reason: ${reason}`);

  // TODO: Implement actual email sending
  // Example with a service like Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'noreply@school.edu',
  //   to,
  //   subject: 'Application Status Update',
  //   html: generateRejectedEmailTemplate(applicantName, reason),
  // });

  return {
    success: true,
    message: `[STUB] Application rejected email would be sent to ${to}`,
  };
}

/**
 * Send email notification when additional information is requested
 */
export async function sendInfoRequestEmail(
  to: string,
  applicantName: string,
  requestDetails: InfoRequestDetails
): Promise<{ success: boolean; message: string }> {
  console.log('[EMAIL STUB] Sending info request email:');
  console.log(`  To: ${to}`);
  console.log(`  Applicant: ${applicantName}`);
  console.log(`  Request Details:`, JSON.stringify(requestDetails, null, 2));

  // TODO: Implement actual email sending
  // Example with a service like Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'noreply@school.edu',
  //   to,
  //   subject: 'Additional Information Required',
  //   html: generateInfoRequestEmailTemplate(applicantName, requestDetails),
  // });

  return {
    success: true,
    message: `[STUB] Info request email would be sent to ${to}`,
  };
}
