'use client';

/**
 * Reactions Bar Component
 * Adaptive emoji reactions based on grade level
 */

import { motion } from 'framer-motion';
import { useLiveReactions, type ReactionType } from '@/hooks/useLiveReactions';
import { getClassroomTheme, getReactionConfig } from '@/lib/utils/classroom/theme';

interface ReactionsBarProps {
  sessionId: string;
  gradeLevel: string;
}

export function ReactionsBar({ sessionId, gradeLevel }: ReactionsBarProps) {
  const theme = getClassroomTheme(gradeLevel);
  const reactions = getReactionConfig(theme.type);
  const { counts, sendReaction } = useLiveReactions(sessionId);

  const handleReaction = async (type: ReactionType) => {
    await sendReaction(type);

    // Playful theme: celebration animation
    if (theme.effects.celebration) {
      playSound();
      showSparkles();
    }
  };

  const playSound = () => {
    // Play a fun sound effect for younger students
    const audio = new Audio('/sounds/pop.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const showSparkles = () => {
    // Trigger confetti/sparkles animation
    if (typeof window !== 'undefined' && (window as any).confetti) {
      (window as any).confetti({
        particleCount: 20,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  return (
    <div className={`w-full ${theme.colors.background} ${theme.spacing.borderRadius} ${theme.effects.shadows ? 'shadow-lg' : 'border border-gray-200'} p-4`}>
      <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
        {reactions.map((reaction) => {
          const count = counts[reaction.type] || 0;
          const isPlayful = theme.type === 'playful';

          return (
            <motion.button
              key={reaction.type}
              onClick={() => handleReaction(reaction.type as ReactionType)}
              className={`
                relative flex flex-col items-center gap-1
                ${theme.spacing.buttonPadding}
                ${theme.spacing.borderRadius}
                ${isPlayful ? 'bg-gradient-to-br from-purple-400 to-pink-400' : 'bg-gray-100 hover:bg-gray-200'}
                transition-all duration-200
                ${theme.effects.shadows ? 'shadow-md hover:shadow-xl' : ''}
                group
              `}
              whileHover={{
                scale: isPlayful ? 1.15 : 1.05,
                rotate: isPlayful ? [0, -5, 5, 0] : 0,
              }}
              whileTap={{
                scale: theme.animations.reactionScale,
              }}
              transition={{
                type: 'spring',
                stiffness: isPlayful ? 300 : 400,
                damping: isPlayful ? 10 : 20,
              }}
            >
              <span className={`${theme.typography.buttonSize}`}>
                {reaction.emoji}
              </span>

              {count > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`
                    absolute -top-2 -right-2
                    ${isPlayful ? 'bg-yellow-400' : 'bg-blue-500'}
                    text-white
                    rounded-full
                    ${isPlayful ? 'w-7 h-7 text-sm' : 'w-6 h-6 text-xs'}
                    flex items-center justify-center
                    font-bold
                    ${theme.effects.shadows ? 'shadow-lg' : ''}
                  `}
                >
                  {count}
                </motion.div>
              )}

              <span className={`${theme.typography.bodySize} ${theme.typography.fontWeight} text-gray-700 group-hover:text-gray-900`}>
                {reaction.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Live count indicator */}
      <div className={`text-center mt-3 ${theme.typography.bodySize} text-gray-500`}>
        {theme.type === 'playful' ? (
          <span>✨ {Object.values(counts).reduce((a, b) => a + b, 0)} reactions sent! ✨</span>
        ) : (
          <span>{Object.values(counts).reduce((a, b) => a + b, 0)} active reactions</span>
        )}
      </div>
    </div>
  );
}
