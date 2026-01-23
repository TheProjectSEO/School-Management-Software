'use client';

/**
 * Recording Indicator Component
 * Shows when session is being recorded
 */

import { motion } from 'framer-motion';
import { getClassroomTheme } from '@/lib/utils/classroom/theme';

interface RecordingIndicatorProps {
  isRecording: boolean;
  gradeLevel: string;
}

export function RecordingIndicator({ isRecording, gradeLevel }: RecordingIndicatorProps) {
  const theme = getClassroomTheme(gradeLevel);
  const isPlayful = theme.type === 'playful';

  if (!isRecording) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        fixed top-4 right-4 z-50
        flex items-center gap-2
        ${isPlayful ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-red-600'}
        text-white
        ${theme.spacing.buttonPadding}
        ${theme.spacing.borderRadius}
        ${theme.effects.shadows ? 'shadow-xl' : 'shadow-md'}
      `}
    >
      {/* Pulsing dot */}
      <motion.div
        className={`${isPlayful ? 'w-4 h-4' : 'w-3 h-3'} bg-white rounded-full`}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [1, 0.7, 1],
        }}
        transition={{
          duration: isPlayful ? 1.5 : 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Text */}
      <span className={`${theme.typography.buttonSize} ${theme.typography.fontWeight}`}>
        {isPlayful ? '🎬 Recording Class!' : 'REC'}
      </span>

      {/* Sparkles for playful theme */}
      {isPlayful && (
        <motion.span
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          ✨
        </motion.span>
      )}
    </motion.div>
  );
}
