'use client';

/**
 * Teacher Live Sessions Dashboard
 * Manage Daily.co virtual classroom sessions
 */

import { useState, useEffect } from 'react';
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

export default function LiveSessionsPage() {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const preselectedCourseId = searchParams.get('courseId');

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
      const response = await fetch('/api/teacher/live-sessions');
      if (response.ok) {
        const data = await response.json();
        // API returns { sessions } in teacher-app and array in student-app; normalize
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
      // Call API to create Daily.co room
      const response = await fetch(`/api/teacher/live-sessions/${sessionId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to start session: ${error.error || 'Unknown error'}`);
        return;
      }

      const data = await response.json();

      // Open the room URL returned by the API
      if (data.roomUrl) {
        window.open(data.roomUrl, '_blank');
      }

      fetchSessions(); // Refresh list
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Error starting session');
    }
  }

  function getDailyRoomUrl(session: LiveSession): string | null {
    // Return the Daily.co room URL if available
    return session.join_url || session.daily_room_url || null;
  }

  async function copyJoinLink(session: LiveSession) {
    const dailyLink = getDailyRoomUrl(session);
    if (!dailyLink) {
      alert('Session has not been started yet. Start the session first to get the join link.');
      return;
    }

    // Copy the Daily.co room URL directly for the teacher
    try {
      await navigator.clipboard.writeText(dailyLink);
      alert('Daily.co room link copied!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert(`Copy this link: ${dailyLink}`);
    }
  }

  async function shareToStudents(session: LiveSession) {
    // Check if session has been started (has a Daily room)
    const dailyLink = getDailyRoomUrl(session);
    if (!dailyLink) {
      alert('Session has not been started yet. Start the session first to share with students.');
      return;
    }

    // Share the Daily.co room URL directly to students
    // Students can join directly via the Daily.co link
    const appJoinLink = dailyLink;

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Live Session: ${session.title}`,
          content: `Join the live session for ${session.course?.name || 'your course'} on ${new Date(
            session.scheduled_start
          ).toLocaleString()}.\n\nJoin here: ${appJoinLink}`,
          target_type: 'course',
          target_course_ids: session.course?.id ? [session.course.id] : [],
          priority: 'high',
          auto_publish: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to send announcement');
        return;
      }

      alert('Announcement sent to students!');
    } catch (error) {
      console.error('Failed to share session:', error);
      alert('Failed to share with students.');
    }
  }

  async function endSession(sessionId: string) {
    if (!confirm('End this session? Recording will be processed.')) return;

    try {
      const response = await fetch(`/api/teacher/live-sessions/${sessionId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Session ended! Recording will be available in ~60 seconds.');
        fetchSessions();
      } else {
        alert('Failed to end session');
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  async function generateTranscript(sessionId: string) {
    if (!confirm('Generate AI transcript for this recording? This may take a minute.')) return;

    try {
      const response = await fetch(`/api/teacher/live-sessions/${sessionId}/transcribe`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Transcript generated successfully!\n\nLanguage: ${data.language || 'Unknown'}\nChunks created: ${data.chunksCreated}\n\nStudents can now use "Ask AI" to ask questions about this recording.`);
        fetchSessions();
      } else if (response.status === 409) {
        alert('Transcript already exists for this session.');
      } else {
        alert(`Failed to generate transcript: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to generate transcript:', error);
      alert('Error generating transcript');
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Sessions</h1>
          <p className="text-gray-600 mt-1">Manage your virtual classroom sessions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          + Schedule Session
        </button>
      </div>

      {/* Sessions List */}
      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">
              videocam
            </span>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sessions Yet</h3>
            <p className="text-gray-500 mb-4">Schedule your first live session to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
            >
              Schedule First Session
            </button>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg border p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{session.title}</h3>
                    <StatusBadge status={session.status} />
                  </div>
                  {/* Display course/subject info if available */}
                  {session.course?.name && (
                    <p className="text-sm text-gray-600 mb-2">
                      {session.course.name}
                      {session.course.subject_code ? ` (${session.course.subject_code})` : ''}
                      {session.section?.name ? ` — ${session.section.name}` : ''}
                    </p>
                  )}
                  {session.description && (
                    <p className="text-gray-700 mb-3">{session.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      {new Date(session.scheduled_start).toLocaleString()}
                    </span>
                    {session.max_participants && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">group</span>
                        Max {session.max_participants} participants
                      </span>
                    )}
                    {session.recording_enabled && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">videocam</span>
                        Recording {session.recording_url ? 'available' : 'enabled'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {session.status === 'scheduled' && (
                    <button
                      onClick={() => startSession(session.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">play_circle</span>
                      Start Session
                    </button>
                  )}
                  {session.status === 'live' && (
                    <>
                      {session.join_url && (
                        <button
                          onClick={() => {
                            if (session.join_url) window.open(session.join_url, '_blank');
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined">video_call</span>
                          Join Room
                        </button>
                      )}
                      <button
                        onClick={() => endSession(session.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined">stop_circle</span>
                        End Session
                      </button>
                    </>
                  )}
                  {session.status !== 'ended' && (
                    <>
                      <button
                        onClick={() => copyJoinLink(session)}
                        className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined">content_copy</span>
                        Copy Join Link
                      </button>
                      <button
                        onClick={() => shareToStudents(session)}
                        className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                        disabled={!session.course?.id}
                      >
                        <span className="material-symbols-outlined">campaign</span>
                        Share to Students
                      </button>
                    </>
                  )}
                  {session.status === 'ended' && (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-green-600">check_circle</span>
                        Completed
                      </span>
                      {session.recording_url && (
                        <>
                          <button
                            onClick={() => window.open(session.recording_url!, '_blank')}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined">play_circle</span>
                            View Recording
                            {session.recording_duration_seconds && (
                              <span className="text-xs opacity-75">
                                ({Math.floor(session.recording_duration_seconds / 60)}m)
                              </span>
                            )}
                          </button>
                          {session.has_transcript ? (
                            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2 text-sm">
                              <span className="material-symbols-outlined text-base">check_circle</span>
                              Transcript Ready
                            </span>
                          ) : (
                            <button
                              onClick={() => generateTranscript(session.id)}
                              className="px-4 py-2 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined">subtitles</span>
                              Generate Transcript
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchSessions();
          }}
          preselectedCourseId={preselectedCourseId}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: LiveSession['status'] }) {
  const colors = {
    scheduled: 'bg-blue-100 text-blue-800',
    live: 'bg-green-100 text-green-800 animate-pulse',
    ended: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

function CreateSessionModal({
  onClose,
  onCreated,
  preselectedCourseId,
}: {
  onClose: () => void;
  onCreated: () => void;
  preselectedCourseId: string | null;
}) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    assignmentId: '',
    title: '',
    description: '',
    startAt: '',
    endAt: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Fetch teacher's subjects/section assignments from teacher-app API
    fetch('/api/teacher/subjects')
      .then((res) => res.json())
      .then((data) => {
        const list = data.subjects || [];
        setSubjects(list);

        if (!formData.assignmentId && preselectedCourseId) {
          const match = list.find((item: any) => item.subject?.id === preselectedCourseId);
          if (match) {
            setFormData((current) => ({
              ...current,
              assignmentId: match.id,
            }));
          }
        }
      })
      .catch(console.error);
  }, [formData.assignmentId, preselectedCourseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/teacher/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: formData.assignmentId,
          title: formData.title,
          description: formData.description,
          startAt: formData.startAt ? new Date(formData.startAt).toISOString() : undefined,
          endAt: formData.endAt ? new Date(formData.endAt).toISOString() : undefined,
          provider: 'daily',
        }),
      });

      if (response.ok) {
        alert('Session scheduled successfully!');
        onCreated();
      } else {
        const error = await response.json();
        alert(`Failed to create session: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Error creating session');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Schedule Live Session</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject/Section *
              </label>
              <select
                value={formData.assignmentId}
                onChange={(e) => setFormData({ ...formData, assignmentId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Select subject...</option>
                {subjects.map((ss) => {
                  const sectionName = ss.section?.name ?? 'Section';
                  const subjectName = ss.subject?.name ?? 'Subject';
                  const subjectCode = ss.subject?.subject_code
                    ? ` (${ss.subject.subject_code})`
                    : '';
                  return (
                    <option key={ss.id} value={ss.id}>
                      {subjectName}{subjectCode} – {sectionName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Introduction to Quadratic Equations"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="What will students learn in this session?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Schedule Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
