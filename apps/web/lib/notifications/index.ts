/**
 * Notification module exports
 *
 * This module provides email and SMS notification helpers.
 * Currently implemented as stubs that log to console.
 */

// Email notifications
export {
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
  sendInfoRequestEmail,
} from './email';

// SMS notifications
export {
  sendApplicationApprovedSMS,
  sendApplicationRejectedSMS,
  sendInfoRequestSMS,
} from './sms';
