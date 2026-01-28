'use client';

/**
 * Participants List Component
 * Shows who's online in the live session
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useLiveSessionPresence } from '@/hooks/useLiveSessionPresence';
import { getClassroomTheme } from '@/lib/utils/classroom/theme';

interface ParticipantsListProps {
  sessionId: string;
  gradeLevel: string;
  currentUser?: {
    id: string;
    name: string;
  };
}

export function ParticipantsList({
  sessionId,
  gradeLevel,
  currentUser,
}: ParticipantsListProps) {
  const theme = getClassroomTheme(gradeLevel);
  const { participants, count, isLoading } = useLiveSessionPresence(sessionId, currentUser);
  const isPlayful = theme.type === 'playful';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = isPlayful
      ? ['bg-pink-400', 'bg-purple-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-orange-400']
      : ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-green-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className={`${theme.spacing.borderRadius} ${theme.effects.shadows ? 'shadow-md' : 'border border-gray-200'} p-4 ${theme.colors.background}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className={`${theme.typography.headingSize} ${theme.typography.fontWeight} text-gray-800`}>
          {isPlayful ? '👥 Who\'s Here' : 'Participants'}
        </h3>
        <motion.div
          key={count}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          className={`
            ${isPlayful ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-blue-600'}
            text-white
            ${isPlayful ? 'px-4 py-2 text-lg' : 'px-3 py-1 text-sm'}
            rounded-full
            font-bold
            ${theme.effects.shadows ? 'shadow-lg' : ''}
          `}
        >
          {count}
        </motion.div>
      </div>

      {/* Participants Grid */}
      {isLoading ? (
        <div className="text-center py-4 text-gray-500">
          {isPlayful ? '🔄 Loading...' : 'Loading...'}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
          <AnimatePresence>
            {participants.map((participant, index) => (
              <motion.div
                key={participant.userId}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  type: 'spring',
                  delay: index * 0.05,
                  stiffness: isPlayful ? 200 : 300,
                }}
                className="flex flex-col items-center"
              >
                {/* Avatar */}
                <motion.div
                  className={`
                    ${isPlayful ? 'w-14 h-14' : 'w-12 h-12'}
                    ${getAvatarColor(participant.userName)}
                    rounded-full
                    flex items-center justify-center
                    text-white
                    font-bold
                    ${isPlayful ? 'text-lg' : 'text-sm'}
                    ${theme.effects.shadows ? 'shadow-md' : ''}
                    ${isPlayful ? 'border-4 border-white' : 'border-2 border-white'}
                    relative
                  `}
                  whileHover={{ scale: isPlayful ? 1.2 : 1.1 }}
                >
                  {getInitials(participant.userName)}

                  {/* Online indicator */}
                  <motion.div
                    className={`
                      absolute -bottom-1 -right-1
                      ${isPlayful ? 'w-5 h-5' : 'w-4 h-4'}
                      bg-green-500
                      rounded-full
                      border-2 border-white
                    `}
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                  />
                </motion.div>

                {/* Name */}
                <div className={`mt-1 text-xs text-center text-gray-600 truncate w-full ${isPlayful ? 'font-bold' : ''}`}>
                  {participant.userName.split(' ')[0]}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer message */}
      {count > 0 && (
        <div className={`mt-3 text-center ${theme.typography.bodySize} text-gray-500`}>
          {isPlayful ? (
            <span>🎉 Everyone is here and ready to learn! 🎉</span>
          ) : (
            <span>{count} {count === 1 ? 'person' : 'people'} online</span>
          )}
        </div>
      )}
    </div>
  );
}
