'use client';

/**
 * Lesson Reactions Component
 * Adaptive reaction bar for individual lessons
 */

import { motion } from 'framer-motion';
import { useLessonReactions, type LessonReactionType } from '@/hooks/useLessonReactions';
import { getClassroomTheme } from '@/lib/utils/classroom/theme';

interface LessonReactionsProps {
  lessonId: string;
  studentId: string;
  gradeLevel: string;
}

const REACTION_CONFIG = [
  { emoji: '👍', type: 'like' as LessonReactionType, label: 'Like' },
  { emoji: '💡', type: 'helpful' as LessonReactionType, label: 'Helpful' },
  { emoji: '😕', type: 'confused' as LessonReactionType, label: 'Confused' },
  { emoji: '❤️', type: 'love' as LessonReactionType, label: 'Love' },
  { emoji: '🎉', type: 'celebrate' as LessonReactionType, label: 'Excellent' },
];

export function LessonReactions({
  lessonId,
  studentId,
  gradeLevel,
}: LessonReactionsProps) {
  const theme = getClassroomTheme(gradeLevel);
  const { counts, myReaction, toggleReaction } = useLessonReactions(lessonId, studentId);
  const isPlayful = theme.type === 'playful';

  return (
    <div className={`w-full ${isPlayful ? 'bg-gradient-to-r from-purple-100 to-pink-100' : 'bg-gray-50'} ${theme.spacing.borderRadius} p-3 ${theme.effects.shadows ? 'shadow-md' : 'border border-gray-200'}`}>
      <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
        {REACTION_CONFIG.map((reaction) => {
          const count = counts[reaction.type] || 0;
          const isActive = myReaction === reaction.type;

          return (
            <motion.button
              key={reaction.type}
              onClick={() => toggleReaction(reaction.type)}
              className={`
                relative flex items-center gap-1.5
                px-3 py-2
                ${theme.spacing.borderRadius}
                ${isActive
                  ? (isPlayful ? 'bg-gradient-to-r from-yellow-400 to-orange-400 scale-110' : 'bg-blue-100 border-2 border-blue-500')
                  : (isPlayful ? 'bg-white border-2 border-purple-200 hover:border-purple-400' : 'bg-white border border-gray-300 hover:border-gray-400')}
                transition-all
                ${theme.effects.shadows && isActive ? 'shadow-lg' : ''}
              `}
              whileHover={{
                scale: isPlayful ? 1.15 : 1.05,
                rotate: isPlayful && isActive ? [0, -10, 10, 0] : 0,
              }}
              whileTap={{ scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: isPlayful ? 300 : 400,
                damping: 15,
              }}
            >
              <span className={isPlayful ? 'text-2xl' : 'text-xl'}>
                {reaction.emoji}
              </span>
              <span className={`${isPlayful ? 'text-base font-bold' : 'text-sm font-medium'} ${isActive ? 'text-gray-800' : 'text-gray-600'}`}>
                {count}
              </span>

              {/* Active indicator for playful theme */}
              {isActive && isPlayful && (
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  ⭐
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Helpful message for playful theme */}
      {isPlayful && (
        <div className="text-center mt-2 text-sm text-purple-600 font-medium">
          {myReaction ? '🌟 Thanks for your feedback!' : '💭 How did you find this lesson?'}
        </div>
      )}
    </div>
  );
}
