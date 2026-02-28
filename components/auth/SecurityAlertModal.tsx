'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSecurityAlerts, SecurityAlert } from '@/hooks/useSecurityAlerts';

/**
 * Listens for blocked login attempts on the current user's account
 * and shows a modal prompting them to change their password.
 */
export function SecurityAlertModal() {
  const { user } = useAuth();
  const router = useRouter();
  const [alert, setAlert] = useState<SecurityAlert | null>(null);

  const { markRead } = useSecurityAlerts(user?.id ?? null, {
    onAlert: useCallback((incoming: SecurityAlert) => {
      setAlert(incoming);
    }, []),
  });

  if (!alert) return null;

  const handleChangePassword = async () => {
    await markRead(alert.id);
    setAlert(null);
    router.push('/forgot-password');
  };

  const handleDismiss = async () => {
    await markRead(alert.id);
    setAlert(null);
  };

  // Parse a human-readable device label from the user-agent string
  const deviceLabel = parseDevice(alert.attacker_ua);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Red header bar */}
        <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-white text-3xl">security</span>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Security Alert</p>
            <p className="text-red-100 text-sm">Unauthorized login attempt detected</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-gray-800 text-sm leading-relaxed">
            Someone just tried to log in to your account from a different device and was{' '}
            <span className="font-semibold text-red-600">blocked</span>.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
            {alert.attacker_ip && (
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-gray-400 text-base mt-0.5">location_on</span>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">IP Address</p>
                  <p className="text-gray-800 font-mono">{alert.attacker_ip}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-gray-400 text-base mt-0.5">devices</span>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Device</p>
                <p className="text-gray-800">{deviceLabel}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-gray-400 text-base mt-0.5">schedule</span>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Time</p>
                <p className="text-gray-800">{new Date(alert.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <p className="text-gray-600 text-sm">
            If this wasn&apos;t you, your password may be compromised. We strongly recommend
            changing it immediately.
          </p>
        </div>

        <div className="px-6 pb-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleChangePassword}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-base">lock_reset</span>
            Change Password Now
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

/** Extract a readable device string from a user-agent. */
function parseDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';

  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) {
    return /Mobile/i.test(ua) ? 'Android Phone' : 'Android Tablet';
  }
  if (/Windows/i.test(ua)) {
    if (/Chrome/i.test(ua)) return 'Windows — Chrome';
    if (/Firefox/i.test(ua)) return 'Windows — Firefox';
    if (/Edge/i.test(ua)) return 'Windows — Edge';
    return 'Windows PC';
  }
  if (/Macintosh/i.test(ua)) {
    if (/Chrome/i.test(ua)) return 'Mac — Chrome';
    if (/Firefox/i.test(ua)) return 'Mac — Firefox';
    if (/Safari/i.test(ua)) return 'Mac — Safari';
    return 'Mac';
  }
  if (/Linux/i.test(ua)) return 'Linux';

  return 'Unknown device';
}
