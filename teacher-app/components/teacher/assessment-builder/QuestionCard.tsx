'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AssessmentQuestion,
  QuestionType,
  QUESTION_TYPE_CONFIG,
  MultipleChoiceContent,
  TrueFalseContent,
  ShortAnswerContent,
  MatchingContent,
  FillInBlankContent,
} from '@/teacher-app/lib/types/assessment-builder';

interface QuestionCardProps {
  question: AssessmentQuestion;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  isDragging?: boolean;
}

export function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
  onDuplicate,
  isDragging = false,
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeConfig = QUESTION_TYPE_CONFIG[question.content.type as QuestionType];

  const renderAnswerPreview = () => {
    switch (question.content.type) {
      case 'multiple_choice_single':
      case 'multiple_choice_multi':
        const mcContent = question.content as MultipleChoiceContent;
        return (
          <div className="space-y-1">
            {mcContent.options.slice(0, 4).map((opt, i) => (
              <div
                key={opt.id}
                className={`flex items-center gap-2 text-xs ${
                  opt.isCorrect ? 'text-green-700 font-medium' : 'text-slate-600'
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                    opt.isCorrect
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {opt.isCorrect && <span className="material-symbols-outlined text-[10px]">check</span>}
                </span>
                <span className="truncate">{opt.text || `Option ${String.fromCharCode(65 + i)}`}</span>
              </div>
            ))}
            {mcContent.options.length > 4 && (
              <span className="text-xs text-slate-400">+{mcContent.options.length - 4} more</span>
            )}
          </div>
        );
      case 'true_false':
        const tfContent = question.content as TrueFalseContent;
        return (
          <div className="flex items-center gap-4 text-xs">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                tfContent.correctAnswer
                  ? 'bg-green-100 text-green-700 font-medium'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tfContent.correctAnswer && <span className="material-symbols-outlined text-xs">check</span>}
              True
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                !tfContent.correctAnswer
                  ? 'bg-green-100 text-green-700 font-medium'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {!tfContent.correctAnswer && <span className="material-symbols-outlined text-xs">check</span>}
              False
            </span>
          </div>
        );
      case 'short_answer':
        const saContent = question.content as ShortAnswerContent;
        return (
          <div className="text-xs text-slate-600">
            <span className="text-green-700 font-medium">
              {saContent.expectedAnswers.filter((a) => a.trim()).join(', ') || 'No answer set'}
            </span>
            <span className="text-slate-400 ml-2">
              {saContent.caseSensitive ? '(case sensitive)' : '(case insensitive)'}
            </span>
          </div>
        );
      case 'matching':
        const matchContent = question.content as MatchingContent;
        return (
          <div className="text-xs text-slate-600">
            {matchContent.pairs.length} matching pairs
          </div>
        );
      case 'fill_in_blank':
        const fibContent = question.content as FillInBlankContent;
        return (
          <div className="text-xs text-slate-600">
            {fibContent.blanks.length} blank{fibContent.blanks.length !== 1 ? 's' : ''} to fill
          </div>
        );
      case 'essay':
        return (
          <div className="text-xs text-slate-500 italic">
            Essay - requires manual grading
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-white transition-all ${
        isSortableDragging || isDragging
          ? 'border-msu-maroon shadow-lg ring-2 ring-msu-maroon/20 opacity-90'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/95 backdrop-blur-sm">
          <div className="text-center p-6">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-3">warning</span>
            <p className="text-sm font-medium text-slate-900 mb-1">Remove this question?</p>
            <p className="text-xs text-slate-500 mb-4">
              This will remove it from the assessment only
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-slate-400 hover:text-slate-600 touch-none"
          aria-label="Drag to reorder"
        >
          <span className="material-symbols-outlined text-lg">drag_indicator</span>
        </button>

        {/* Question Number */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-msu-maroon/10 text-sm font-semibold text-msu-maroon shrink-0">
          {index + 1}
        </div>

        {/* Question Content */}
        <div className="flex-1 min-w-0">
          {/* Type and Meta */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="material-symbols-outlined text-slate-400 text-lg">
              {typeConfig?.icon || 'help'}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {typeConfig?.label || question.content.type}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                question.difficulty === 'easy'
                  ? 'bg-green-100 text-green-700'
                  : question.difficulty === 'medium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {question.difficulty}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {question.points} pt{question.points !== 1 ? 's' : ''}
            </span>
            {question.bankQuestionId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                <span className="material-symbols-outlined text-xs">folder</span>
                from bank
              </span>
            )}
          </div>

          {/* Prompt */}
          <p className={`text-sm text-slate-900 ${isExpanded ? '' : 'line-clamp-2'}`}>
            {question.prompt}
          </p>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-3 space-y-3">
              {/* Answer Preview */}
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500 mb-2">Answer:</div>
                {renderAnswerPreview()}
              </div>

              {/* Explanation */}
              {question.explanation && (
                <div className="rounded-lg bg-blue-50 p-3">
                  <div className="flex items-center gap-1 text-xs font-medium text-blue-700 mb-1">
                    <span className="material-symbols-outlined text-sm">lightbulb</span>
                    Explanation
                  </div>
                  <p className="text-xs text-blue-600">{question.explanation}</p>
                </div>
              )}

              {/* Tags */}
              {question.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {question.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-start gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <span
              className={`material-symbols-outlined transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-msu-maroon"
            title="Edit question"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Duplicate question"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
            title="Remove question"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
