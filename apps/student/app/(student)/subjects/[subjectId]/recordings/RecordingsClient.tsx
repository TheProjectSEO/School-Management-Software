'use client';

/**
 * Recordings Client Component
 * Browse and playback past session recordings
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getClassroomTheme } from '@/lib/utils/classroom/theme';
import { RecordingAIPanel } from './RecordingAIPanel';

interface Recording {
  id: string;
  title: string;
  description: string | null;
  actual_start: string;
  actual_end: string;
  recording_url: string;
  recording_duration_seconds: number | null;
  module: {
    id: string;
    title: string;
  } | null;
}

interface RecordingsClientProps {
  course: {
    id: string;
    name: string;
    subject_code: string | null;
    section: {
      grade_level: string;
    };
  };
  sessions: Recording[];
  gradeLevel: string;
}

export function RecordingsClient({
  course,
  sessions,
  gradeLevel,
}: RecordingsClientProps) {
  const theme = getClassroomTheme(gradeLevel);
  const isPlayful = theme.type === 'playful';
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`min-h-screen ${isPlayful ? 'bg-gradient-to-br from-purple-50 to-pink-50' : 'bg-gray-50'} p-4 md:p-8`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`${isPlayful ? 'text-3xl' : 'text-2xl'} ${theme.typography.fontWeight} text-gray-800 mb-2`}>
          {isPlayful ? '🎬 Class Recordings' : 'Session Recordings'}
        </h1>
        <p className="text-gray-600">
          {course.name} ({course.subject_code || "Course"})
        </p>
      </div>

      {/* Video Player */}
      <AnimatePresence>
        {selectedRecording && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 ${theme.spacing.borderRadius} overflow-hidden ${theme.effects.shadows ? 'shadow-2xl' : 'border border-gray-200'} bg-black`}
          >
            <video
              key={selectedRecording.id}
              controls
              className="w-full"
              style={{ maxHeight: '500px' }}
              src={selectedRecording.recording_url}
            >
              Your browser does not support video playback.
            </video>

            {/* Video Info */}
            <div className="bg-white p-4">
              <h2 className={`${theme.typography.headingSize} ${theme.typography.fontWeight} text-gray-800 mb-2`}>
                {selectedRecording.title}
              </h2>
              {selectedRecording.module && (
                <p className="text-sm text-gray-600 mb-1">
                  Module: {selectedRecording.module.title}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{isPlayful ? '📅 ' : ''}{formatDate(selectedRecording.actual_start)}</span>
                <span>{isPlayful ? '⏱️ ' : ''}{formatDuration(selectedRecording.recording_duration_seconds)}</span>
              </div>
              {selectedRecording.description && (
                <p className="mt-2 text-gray-700">{selectedRecording.description}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedRecording && (
        <div className="mb-8">
          <RecordingAIPanel
            sessionId={selectedRecording.id}
            sessionTitle={selectedRecording.title}
            courseName={course.name}
          />
        </div>
      )}

      {/* Recordings List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">{isPlayful ? '🎥' : '📹'}</div>
            <h2 className={`${theme.typography.headingSize} text-gray-600 mb-2`}>
              {isPlayful ? 'No recordings yet!' : 'No Recordings Available'}
            </h2>
            <p className="text-gray-500">
              {isPlayful ? 'Check back after your first live class!' : 'Recordings will appear here after live sessions'}
            </p>
          </div>
        ) : (
          sessions.map((session, index) => (
            <motion.button
              key={session.id}
              onClick={() => setSelectedRecording(session)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                text-left
                ${theme.spacing.borderRadius}
                ${selectedRecording?.id === session.id
                  ? (isPlayful ? 'bg-gradient-to-br from-purple-100 to-pink-100 border-4 border-purple-400' : 'bg-blue-50 border-2 border-blue-500')
                  : (isPlayful ? 'bg-white border-2 border-purple-200 hover:border-purple-400' : 'bg-white border border-gray-200 hover:border-blue-300')}
                p-4
                ${theme.effects.shadows ? 'shadow-md hover:shadow-xl' : ''}
                transition-all
              `}
              whileHover={{ scale: isPlayful ? 1.05 : 1.02 }}
            >
              {/* Thumbnail placeholder */}
              <div className={`${theme.spacing.borderRadius} bg-gray-800 aspect-video mb-3 flex items-center justify-center text-white text-4xl`}>
                {isPlayful ? '🎬' : '▶️'}
              </div>

              {/* Title */}
              <h3 className={`${theme.typography.bodySize} ${theme.typography.fontWeight} text-gray-800 mb-1 line-clamp-2`}>
                {session.title}
              </h3>

              {/* Module */}
              {session.module && (
                <p className="text-xs text-gray-600 mb-2">
                  {isPlayful ? '📚 ' : ''}{session.module.title}
                </p>
              )}

              {/* Meta info */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatDate(session.actual_start)}</span>
                <span className={`${isPlayful ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-700'} px-2 py-1 rounded-full font-medium`}>
                  {formatDuration(session.recording_duration_seconds)}
                </span>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
