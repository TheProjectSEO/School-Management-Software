'use client';

import { authFetch } from "@/lib/utils/authFetch";


/**
 * Teacher Live Sessions Dashboard
 * Manage Daily.co virtual classroom sessions
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

interface LiveSession {
  id: string;
  course_id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  join_url: string | null;
  daily_room_url?: string | null;
  recording_url?: string | null;
  recording_enabled?: boolean;
  recording_duration_seconds?: number;
  max_participants?: number;
  has_transcript?: boolean;
  course?: {
    id: string;
    name: string;
    subject_code: string;
  };
  section?: {
    id: string;
    name: string;
  };
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

type StatusFilter = 'all' | 'scheduled' | 'live' | 'ended' | 'cancelled';

export default function LiveSessionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [transcriptData, setTranscriptData] = useState<{
    sessionTitle: string;
    transcript: string;
    language: string;
  } | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<StatusFilter>('all');
  const preselectedCourseId = searchParams.get('courseId');

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (searchParams.get('openCreate') === '1') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  async function fetchSessions() {
    try {
      const response = await authFetch('/api/teacher/live-sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions((data.sessions ?? data ?? []) as LiveSession[]);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function startSession(sessionId: string) {
    try {
      const response = await authFetch(`/api/teacher/live-sessions/${sessionId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        showToast(`Failed to start session: ${error.error || 'Unknown error'}`, 'error');
        return;
      }

      await response.json();

      router.push(`/teacher/live-sessions/${sessionId}`);

      fetchSessions();
    } catch (error) {
      console.error('Failed to start session:', error);
      showToast('Error starting session. Please try again.', 'error');
    }
  }

  function getDailyRoomUrl(session: LiveSession): string | null {
    return session.join_url || session.daily_room_url || null;
  }

  async function copyJoinLink(session: LiveSession) {
    const dailyLink = getDailyRoomUrl(session);
    if (!dailyLink) {
      showToast('Session has not been started yet. Start the session first to get the join link.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(dailyLink);
      showToast('Join link copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy link:', error);
      showToast(`Could not copy automatically. Link: ${dailyLink}`, 'info');
    }
  }

  async function shareToStudents(session: LiveSession) {
    const dailyLink = getDailyRoomUrl(session);
    if (!dailyLink) {
      showToast('Session has not been started yet. Start the session first to share with students.', 'warning');
      return;
    }

    const sectionId = session.section?.id;
    if (!sectionId) {
      showToast('Unable to determine the class section for this session.', 'error');
      return;
    }

    const appJoinLink = dailyLink;

    try {
      const response = await authFetch('/api/teacher/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Live Session: ${session.title}`,
          body: `Join the live session for ${session.course?.name || 'your course'} on ${new Date(
            session.scheduled_start
          ).toLocaleString()}.\n\nJoin here: ${appJoinLink}`,
          scopeType: 'section',
          scopeIds: [sectionId],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        showToast(data.error || 'Failed to send announcement to students.', 'error');
        return;
      }

      showToast('Announcement sent to students successfully!', 'success');
    } catch (error) {
      console.error('Failed to share session:', error);
      showToast('Failed to share with students. Please try again.', 'error');
    }
  }

  async function endSession(sessionId: string) {
    if (!confirm('End this session? Recording will be processed.')) return;

    try {
      const response = await authFetch(`/api/teacher/live-sessions/${sessionId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        showToast('Session ended. Recording will be available in about 60 seconds.', 'success');
        fetchSessions();
      } else {
        showToast('Failed to end session. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      showToast('Error ending session. Please try again.', 'error');
    }
  }

  async function cancelSession(sessionId: string) {
    if (!confirm('Cancel this session? This cannot be undone.')) return;

    try {
      const response = await authFetch(`/api/teacher/live-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        showToast('Session has been cancelled.', 'info');
        fetchSessions();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to cancel session. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Failed to cancel session:', error);
      showToast('Error cancelling session. Please try again.', 'error');
    }
  }

  async function processRecording(sessionId: string) {
    if (!confirm('Process recording for this session? This may take a minute.')) return;

    try {
      const response = await authFetch(`/api/teacher/live-sessions/${sessionId}/recording`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const duration = data.duration ? `${Math.floor(data.duration / 60)} minute(s)` : null;
        showToast(
          duration
            ? `Recording processed successfully! Duration: ${duration}`
            : 'Recording processed successfully!',
          'success'
        );
        fetchSessions();
      } else {
        // User-friendly error — the raw API error is logged to console only
        console.error('Recording processing error:', data.error);
        showToast(
          'Recording is not available yet. Daily.co may still be processing it — please wait a few minutes and try again.',
          'warning'
        );
      }
    } catch (error) {
      console.error('Failed to process recording:', error);
      showToast('Error processing recording. Please try again.', 'error');
    }
  }

  async function generateTranscript(sessionId: string) {
    if (!confirm('Generate AI transcript for this recording? This may take a minute.')) return;

    try {
      const response = await authFetch(`/api/teacher/live-sessions/${sessionId}/transcribe`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        showToast(
          `Transcript generated! Students can now use "Ask AI" to ask questions about this recording.`,
          'success'
        );
        fetchSessions();
      } else if (response.status === 409) {
        showToast('A transcript already exists for this session.', 'info');
      } else {
        showToast(`Failed to generate transcript: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to generate transcript:', error);
      showToast('Error generating transcript. Please try again.', 'error');
    }
  }

  async function viewTranscript(sessionId: string) {
    setLoadingTranscript(true);
    setShowTranscriptModal(true);

    try {
      const response = await authFetch(`/api/teacher/live-sessions/${sessionId}/transcribe`);
      const data = await response.json();

      if (response.ok && data.hasTranscript) {
        const fullResponse = await authFetch(`/api/teacher/live-sessions/${sessionId}/transcript`);
        const fullData = await fullResponse.json();

        const session = sessions.find(s => s.id === sessionId);
        setTranscriptData({
          sessionTitle: session?.title || 'Session',
          transcript: fullData.transcript || data.preview || 'No transcript content available',
          language: data.language || 'Unknown'
        });
      } else {
        setTranscriptData({
          sessionTitle: 'Session',
          transcript: 'No transcript available for this session.',
          language: ''
        });
      }
    } catch (error) {
      console.error('Failed to load transcript:', error);
      setTranscriptData({
        sessionTitle: 'Error',
        transcript: 'Failed to load transcript. Please try again.',
        language: ''
      });
    } finally {
      setLoadingTranscript(false);
    }
  }

  // Tab counts
  const tabCounts: Record<StatusFilter, number> = {
    all: sessions.length,
    scheduled: sessions.filter(s => s.status === 'scheduled').length,
    live: sessions.filter(s => s.status === 'live').length,
    ended: sessions.filter(s => s.status === 'ended').length,
    cancelled: sessions.filter(s => s.status === 'cancelled').length,
  };

  const TABS: { key: StatusFilter; label: string; dot?: boolean }[] = [
    { key: 'all', label: 'All Sessions' },
    { key: 'live', label: 'Live Now', dot: true },
    { key: 'scheduled', label: 'Upcoming' },
    { key: 'ended', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const filteredSessions =
    activeTab === 'all' ? sessions : sessions.filter(s => s.status === activeTab);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right-5 duration-300 ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : toast.type === 'warning'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-800 text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5">
              {toast.type === 'success'
                ? 'check_circle'
                : toast.type === 'error'
                ? 'error'
                : toast.type === 'warning'
                ? 'warning'
                : 'info'}
            </span>
            <span className="leading-snug">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-auto shrink-0 opacity-75 hover:opacity-100"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Live Sessions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your virtual classroom sessions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Schedule Session
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-0 overflow-x-auto" aria-label="Session status filter">
          {TABS.map(({ key, label, dot }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {dot && tabCounts.live > 0 && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              )}
              {label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeTab === key ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {tabCounts[key]}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Sessions List */}
      <div className="flex flex-col gap-3">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
            <span className="material-symbols-outlined text-5xl text-gray-300 mb-3 block">videocam_off</span>
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              {activeTab === 'all'
                ? 'No sessions yet'
                : activeTab === 'live'
                ? 'No live sessions right now'
                : activeTab === 'scheduled'
                ? 'No upcoming sessions'
                : activeTab === 'ended'
                ? 'No completed sessions'
                : 'No cancelled sessions'}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {activeTab === 'all' || activeTab === 'scheduled'
                ? 'Schedule your first session to get started.'
                : activeTab === 'live'
                ? 'Start a scheduled session to go live.'
                : ''}
            </p>
            {(activeTab === 'all' || activeTab === 'scheduled') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover"
              >
                + Schedule a Session
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const startDate = new Date(session.scheduled_start);
            const endDate = session.scheduled_end ? new Date(session.scheduled_end) : null;
            const formattedDate = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const formattedStart = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const formattedEnd = endDate ? endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;

            const borderColor = {
              live: 'border-l-green-500',
              scheduled: 'border-l-blue-400',
              ended: 'border-l-gray-300',
              cancelled: 'border-l-red-300',
            }[session.status];

            return (
              <div
                key={session.id}
                className={`bg-white rounded-xl border border-l-4 ${borderColor} border-gray-200 shadow-sm hover:shadow-md transition-shadow`}
              >
                {/* Main card body */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                  {/* Left: session info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-base font-bold text-gray-900 leading-tight">{session.title}</h3>
                      <StatusBadge status={session.status} />
                    </div>

                    {session.course?.name && (
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-gray-400">book_2</span>
                        {session.course.name}
                        {session.course.subject_code && (
                          <span className="text-gray-400">({session.course.subject_code})</span>
                        )}
                        {session.section?.name && (
                          <span className="text-gray-400">· {session.section.name}</span>
                        )}
                      </p>
                    )}

                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-1">
                      <span className="material-symbols-outlined text-sm text-gray-400">calendar_today</span>
                      {formattedDate}
                      <span className="text-gray-300">·</span>
                      <span className="material-symbols-outlined text-sm text-gray-400">schedule</span>
                      {formattedStart}{formattedEnd && ` – ${formattedEnd}`}
                    </p>

                    {session.max_participants && (
                      <p className="text-sm text-gray-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">group</span>
                        Up to {session.max_participants} participants
                      </p>
                    )}

                    {session.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{session.description}</p>
                    )}
                  </div>

                  {/* Right: primary actions — always stacked, full-width on mobile */}
                  <div className="flex flex-col gap-2 sm:shrink-0 sm:min-w-[160px]">
                    {session.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => startSession(session.id)}
                          className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 active:bg-green-800 flex items-center justify-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">play_circle</span>
                          Start Now
                        </button>
                        <button
                          onClick={() => shareToStudents(session)}
                          className="w-full px-4 py-2.5 border border-blue-200 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 active:bg-blue-100 flex items-center justify-center gap-2 transition-colors"
                          disabled={!session.course?.id}
                        >
                          <span className="material-symbols-outlined text-base">campaign</span>
                          Notify Students
                        </button>
                        <button
                          onClick={() => cancelSession(session.id)}
                          className="w-full px-4 py-2.5 border border-red-200 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 active:bg-red-100 flex items-center justify-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">cancel</span>
                          Cancel Session
                        </button>
                      </>
                    )}

                    {session.status === 'live' && (
                      <>
                        {session.join_url && (
                          <button
                            onClick={() => router.push(`/teacher/live-sessions/${session.id}`)}
                            className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-2 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">video_call</span>
                            Rejoin Room
                          </button>
                        )}
                        <button
                          onClick={() => shareToStudents(session)}
                          className="w-full px-4 py-2.5 border border-blue-200 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 active:bg-blue-100 flex items-center justify-center gap-2 transition-colors"
                          disabled={!session.course?.id}
                        >
                          <span className="material-symbols-outlined text-base">campaign</span>
                          Notify Students
                        </button>
                        <button
                          onClick={() => endSession(session.id)}
                          className="w-full px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 active:bg-red-800 flex items-center justify-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">stop_circle</span>
                          End Session
                        </button>
                      </>
                    )}

                    {session.status === 'cancelled' && (
                      <span className="text-sm text-gray-400 flex items-center gap-1.5 py-1">
                        <span className="material-symbols-outlined text-base text-red-400">cancel</span>
                        Session was cancelled
                      </span>
                    )}
                  </div>
                </div>

                {/* Completed session: recording + transcript row */}
                {session.status === 'ended' && (
                  <div className="border-t border-gray-100 px-4 sm:px-5 py-4 bg-gray-50 rounded-b-xl flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-base text-green-500">check_circle</span>
                      <span className="font-medium text-gray-700">Session Complete</span>
                      {session.recording_duration_seconds && (
                        <span className="text-gray-400 text-xs">· {Math.floor(session.recording_duration_seconds / 60)} min</span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {session.recording_url ? (
                        <>
                          <button
                            onClick={() => window.open(session.recording_url!, '_blank')}
                            className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 active:bg-purple-800 flex items-center justify-center gap-2 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">play_circle</span>
                            Watch Recording
                          </button>
                          {session.has_transcript ? (
                            <button
                              onClick={() => viewTranscript(session.id)}
                              className="w-full sm:w-auto px-4 py-2.5 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-50 active:bg-emerald-100 flex items-center justify-center gap-2 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">description</span>
                              View Transcript
                            </button>
                          ) : (
                            <button
                              onClick={() => generateTranscript(session.id)}
                              className="w-full sm:w-auto px-4 py-2.5 border border-purple-200 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-50 active:bg-purple-100 flex items-center justify-center gap-2 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">auto_awesome</span>
                              Generate AI Transcript
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => processRecording(session.id)}
                          className="w-full sm:w-auto px-4 py-2.5 border border-amber-200 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-50 active:bg-amber-100 flex items-center justify-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">sync</span>
                          Fetch Recording
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Copy link footer */}
                {(session.status === 'live' || session.status === 'scheduled') && (
                  <div className="border-t border-gray-100 px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-400 min-w-0 truncate">
                      {getDailyRoomUrl(session)
                        ? 'Join link ready — copy or share with students'
                        : 'Join link available after session starts'}
                    </span>
                    <button
                      onClick={() => copyJoinLink(session)}
                      className="shrink-0 text-xs text-gray-500 hover:text-primary active:text-primary flex items-center gap-1 transition-colors py-1 px-2 rounded hover:bg-gray-100"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      Copy Link
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchSessions();
            showToast('Session scheduled successfully!', 'success');
          }}
          onError={(msg) => showToast(msg, 'error')}
          preselectedCourseId={preselectedCourseId}
        />
      )}

      {/* Transcript Modal */}
      {showTranscriptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Session Transcript
                </h2>
                {transcriptData && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {transcriptData.sessionTitle}
                    {transcriptData.language && ` • Language: ${transcriptData.language}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowTranscriptModal(false);
                  setTranscriptData(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingTranscript ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-slate-600 dark:text-slate-400">Loading transcript...</span>
                </div>
              ) : transcriptData ? (
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                    {transcriptData.transcript}
                  </div>
                </div>
              ) : (
                <p className="text-slate-600 dark:text-slate-400 text-center py-12">
                  No transcript available.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              {transcriptData?.transcript && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(transcriptData.transcript);
                    showToast('Transcript copied to clipboard!', 'success');
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined">content_copy</span>
                  Copy Transcript
                </button>
              )}
              <button
                onClick={() => {
                  setShowTranscriptModal(false);
                  setTranscriptData(null);
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: LiveSession['status'] }) {
  const config: Record<LiveSession['status'], { label: string; className: string }> = {
    scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
    live: { label: '● Live', className: 'bg-green-100 text-green-800 animate-pulse' },
    ended: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  };

  const { label, className } = config[status];

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function CreateSessionModal({
  onClose,
  onCreated,
  onError,
  preselectedCourseId,
}: {
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
  preselectedCourseId: string | null;
}) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [sessionType, setSessionType] = useState<'module' | 'quick'>('module');
  const [formData, setFormData] = useState({
    assignmentId: '',
    moduleId: '',
    title: '',
    description: '',
    startAt: '',
    endAt: '',
  });
  const [creating, setCreating] = useState(false);

  // Load subjects on mount
  useEffect(() => {
    authFetch('/api/teacher/subjects')
      .then((res) => res.json())
      .then((data) => {
        const list = data.subjects || [];
        setSubjects(list);
        if (!formData.assignmentId && preselectedCourseId) {
          const match = list.find((item: any) => item.subject?.id === preselectedCourseId);
          if (match) setFormData((cur) => ({ ...cur, assignmentId: match.id }));
        }
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedCourseId]);

  // Load modules when subject changes (module session only)
  useEffect(() => {
    if (!formData.assignmentId || sessionType !== 'module') {
      setModules([]);
      setFormData((cur) => ({ ...cur, moduleId: '' }));
      return;
    }
    const subject = subjects.find((s) => s.id === formData.assignmentId);
    const courseId = subject?.subject?.id;
    if (!courseId) return;

    setLoadingModules(true);
    authFetch(`/api/teacher/modules?courseId=${courseId}`)
      .then((res) => res.json())
      .then((data) => setModules(data.modules || []))
      .catch(console.error)
      .finally(() => setLoadingModules(false));
  }, [formData.assignmentId, sessionType, subjects]);

  // Auto-fill title from selected module
  const selectedModule = modules.find((m) => m.id === formData.moduleId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    const title =
      sessionType === 'module'
        ? selectedModule?.title || selectedModule?.name || 'Module Session'
        : formData.title;

    try {
      const response = await authFetch('/api/teacher/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: formData.assignmentId,
          moduleId: sessionType === 'module' ? formData.moduleId || null : null,
          title,
          description: formData.description,
          startAt: formData.startAt ? new Date(formData.startAt).toISOString() : undefined,
          endAt: formData.endAt ? new Date(formData.endAt).toISOString() : undefined,
          provider: 'daily',
        }),
      });

      if (response.ok) {
        onCreated();
      } else {
        const error = await response.json();
        onError(`Failed to create session: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      onError('Error creating session. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  const isModuleSession = sessionType === 'module';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl z-10">
          <h2 className="text-lg font-bold text-gray-900">Schedule Live Session</h2>
          <button
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 pb-8">

          {/* Session type toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setSessionType('module')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                isModuleSession
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              Module Session
            </button>
            <button
              type="button"
              onClick={() => setSessionType('quick')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                !isModuleSession
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              Quick Meeting
            </button>
          </div>

          {/* Helper text */}
          <p className="text-xs text-gray-400 -mt-1">
            {isModuleSession
              ? 'Tied to a specific module — students see which topic is covered.'
              : 'General session not tied to any module — good for Q&A, reviews, or announcements.'}
          </p>

          {/* Subject & Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Subject &amp; Section <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assignmentId}
              onChange={(e) =>
                setFormData({ ...formData, assignmentId: e.target.value, moduleId: '' })
              }
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              required
            >
              <option value="">Select a subject...</option>
              {subjects.map((ss) => {
                const sectionName = ss.section?.name ?? 'Section';
                const subjectName = ss.subject?.name ?? 'Subject';
                const subjectCode = ss.subject?.subject_code ? ` (${ss.subject.subject_code})` : '';
                return (
                  <option key={ss.id} value={ss.id}>
                    {subjectName}{subjectCode} – {sectionName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Module picker (module session only) */}
          {isModuleSession && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Module <span className="text-red-500">*</span>
              </label>
              {!formData.assignmentId ? (
                <p className="text-sm text-gray-400 italic">Select a subject first to load modules.</p>
              ) : loadingModules ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                  Loading modules...
                </div>
              ) : modules.length === 0 ? (
                <p className="text-sm text-orange-500">No modules found for this subject. Use Quick Meeting instead, or create modules first.</p>
              ) : (
                <select
                  value={formData.moduleId}
                  onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                >
                  <option value="">Select a module...</option>
                  {modules.map((m, idx) => (
                    <option key={m.id} value={m.id}>
                      Module {idx + 1}: {m.title || m.name}
                    </option>
                  ))}
                </select>
              )}
              {selectedModule && (
                <p className="text-xs text-gray-500 mt-1">
                  Session title will be: <span className="font-medium text-gray-700">{selectedModule.title || selectedModule.name}</span>
                </p>
              )}
            </div>
          )}

          {/* Custom title (quick meeting only) */}
          {!isModuleSession && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Session Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="e.g., Q&A Session, Exam Review, General Meeting"
                required
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              rows={2}
              placeholder={isModuleSession ? 'Any notes for students about this session?' : 'What is this meeting about?'}
            />
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.startAt}
                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                End Time <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={formData.endAt}
                onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover active:scale-95 disabled:opacity-50 transition-all"
            >
              {creating ? 'Scheduling...' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
