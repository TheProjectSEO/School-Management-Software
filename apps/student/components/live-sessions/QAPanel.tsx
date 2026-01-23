'use client';

/**
 * Q&A Panel Component
 * Adaptive question/answer interface based on grade level
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveSessionQA } from '@/hooks/useLiveSessionQA';
import { getClassroomTheme } from '@/lib/utils/classroom/theme';

interface QAPanelProps {
  sessionId: string;
  gradeLevel: string;
}

export function QAPanel({ sessionId, gradeLevel }: QAPanelProps) {
  const theme = getClassroomTheme(gradeLevel);
  const { questions, askQuestion, upvoteQuestion, isLoading } = useLiveSessionQA(sessionId);
  const [newQuestion, setNewQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setIsSubmitting(true);
    try {
      await askQuestion(newQuestion);
      setNewQuestion('');

      // Playful theme: celebrate asking a question!
      if (theme.effects.celebration) {
        const audio = new Audio('/sounds/question.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
    } catch (error) {
      console.error('Failed to ask question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPlayful = theme.type === 'playful';

  return (
    <div className={`flex flex-col h-full ${theme.colors.background} ${theme.spacing.borderRadius} ${theme.effects.shadows ? 'shadow-lg' : 'border border-gray-200'} overflow-hidden`}>
      {/* Header */}
      <div className={`${isPlayful ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-blue-600'} p-4`}>
        <h3 className={`${theme.typography.headingSize} ${theme.typography.fontWeight} text-white`}>
          {theme.language.askQuestion}
        </h3>
      </div>

      {/* Question Input */}
      <form onSubmit={handleSubmit} className="p-4 border-b">
        <div className="flex gap-2">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder={isPlayful ? "What's your question? 🤔" : "Type your question..."}
            className={`
              flex-1
              ${theme.spacing.buttonPadding}
              ${theme.spacing.borderRadius}
              border-2
              ${isPlayful ? 'border-purple-300 focus:border-purple-500' : 'border-gray-300 focus:border-blue-500'}
              ${theme.typography.bodySize}
              focus:outline-none
              transition-colors
            `}
            disabled={isSubmitting}
          />
          <motion.button
            type="submit"
            disabled={isSubmitting || !newQuestion.trim()}
            className={`
              ${theme.spacing.buttonPadding}
              ${theme.spacing.borderRadius}
              ${theme.typography.buttonSize}
              ${theme.typography.fontWeight}
              ${isPlayful ? 'bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500' : 'bg-blue-600 hover:bg-blue-700'}
              text-white
              disabled:opacity-50 disabled:cursor-not-allowed
              ${theme.effects.shadows ? 'shadow-md hover:shadow-lg' : ''}
              transition-all
            `}
            whileHover={{ scale: isPlayful ? 1.1 : 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            {isSubmitting ? '...' : theme.language.submit}
          </motion.button>
        </div>
      </form>

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            {isPlayful ? '🔍 Loading questions...' : 'Loading questions...'}
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {isPlayful ? '🎈 No questions yet! Be the first to ask!' : 'No questions yet'}
          </div>
        ) : (
          <AnimatePresence>
            {questions.map((q, index) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  ${theme.spacing.borderRadius}
                  ${q.is_answered
                    ? (isPlayful ? 'bg-green-100 border-2 border-green-300' : 'bg-green-50 border border-green-200')
                    : (isPlayful ? 'bg-white border-2 border-purple-200' : 'bg-gray-50 border border-gray-200')}
                  p-4
                  ${theme.effects.shadows && !q.is_answered ? 'shadow-sm hover:shadow-md' : ''}
                  transition-shadow
                `}
              >
                {/* Student name */}
                <div className={`${theme.typography.bodySize} font-medium text-gray-600 mb-1`}>
                  {isPlayful ? '👤' : ''} {q.student?.first_name} {q.student?.last_name}
                </div>

                {/* Question */}
                <div className={`${theme.typography.bodySize} text-gray-800 mb-2`}>
                  {q.question}
                </div>

                {/* Answer */}
                {q.is_answered && q.answer && (
                  <div className={`mt-2 pt-2 border-t ${isPlayful ? 'border-green-300' : 'border-green-200'}`}>
                    <div className="text-sm font-medium text-green-700 mb-1">
                      {isPlayful ? '✅ Answer:' : 'Teacher\'s Answer:'}
                    </div>
                    <div className="text-sm text-gray-700">{q.answer}</div>
                  </div>
                )}

                {/* Upvote button */}
                <div className="flex items-center gap-2 mt-3">
                  <motion.button
                    onClick={() => upvoteQuestion(q.id)}
                    className={`
                      flex items-center gap-1
                      px-3 py-1
                      ${isPlayful ? 'bg-purple-100 hover:bg-purple-200' : 'bg-gray-200 hover:bg-gray-300'}
                      ${theme.spacing.borderRadius}
                      text-sm
                      transition-colors
                    `}
                    whileHover={{ scale: isPlayful ? 1.1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>{isPlayful ? '⭐' : '👍'}</span>
                    <span className="font-medium">{q.upvotes}</span>
                  </motion.button>

                  {q.is_answered && (
                    <div className={`${isPlayful ? 'text-green-600' : 'text-green-500'} text-sm font-medium`}>
                      {isPlayful ? '✨ Answered!' : 'Answered'}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
