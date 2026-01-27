'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { AssessmentQuestion } from '@/lib/types/assessment-builder';
import { QuestionCard } from './QuestionCard';

interface QuestionListProps {
  questions: AssessmentQuestion[];
  onReorder: (questions: AssessmentQuestion[]) => void;
  onEditQuestion: (question: AssessmentQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion?: (question: AssessmentQuestion) => void;
  onAddQuestion: () => void;
  onAddFromBank: () => void;
}

export function QuestionList({
  questions,
  onReorder,
  onEditQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onAddQuestion,
  onAddFromBank,
}: QuestionListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);

      const reordered = arrayMove(questions, oldIndex, newIndex).map((q, index) => ({
        ...q,
        orderIndex: index,
      }));

      onReorder(reordered);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeQuestion = activeId
    ? questions.find((q) => q.id === activeId)
    : null;

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-2xl font-bold text-slate-900">{questions.length}</div>
            <div className="text-sm text-slate-500">Questions</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <div className="text-2xl font-bold text-msu-maroon">{totalPoints}</div>
            <div className="text-sm text-slate-500">Total Points</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddFromBank}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-lg">folder</span>
            From Bank
          </button>
          <button
            type="button"
            onClick={onAddQuestion}
            className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New Question
          </button>
        </div>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-slate-400">quiz</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Questions Yet</h3>
          <p className="text-sm text-slate-500 mb-4">
            Add questions to build your assessment
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onAddFromBank}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-lg">folder</span>
              From Question Bank
            </button>
            <button
              type="button"
              onClick={onAddQuestion}
              className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Create New Question
            </button>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={questions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  onEdit={() => onEditQuestion(question)}
                  onDelete={() => onDeleteQuestion(question.id)}
                  onDuplicate={
                    onDuplicateQuestion
                      ? () => onDuplicateQuestion(question)
                      : undefined
                  }
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeQuestion && (
              <div className="opacity-90 shadow-2xl">
                <QuestionCard
                  question={activeQuestion}
                  index={questions.findIndex((q) => q.id === activeQuestion.id)}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  isDragging
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add More */}
      {questions.length > 0 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            type="button"
            onClick={onAddFromBank}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-msu-maroon"
          >
            <span className="material-symbols-outlined text-lg">folder</span>
            Add from bank
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={onAddQuestion}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-msu-maroon"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create new question
          </button>
        </div>
      )}
    </div>
  );
}
