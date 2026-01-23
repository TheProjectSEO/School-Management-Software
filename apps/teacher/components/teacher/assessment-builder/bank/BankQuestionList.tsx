'use client';

import { useState } from 'react';
import { BankQuestion, QuestionBank, QUESTION_TYPE_CONFIG, QuestionType, QuestionFilters } from '@/lib/types/assessment-builder';

interface BankQuestionListProps {
  bank: QuestionBank;
  questions: BankQuestion[];
  onBack: () => void;
  onAddQuestion: () => void;
  onEditQuestion: (question: BankQuestion) => void;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onFilterChange?: (filters: QuestionFilters) => void;
  isLoading?: boolean;
}

export function BankQuestionList({
  bank,
  questions,
  onBack,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onFilterChange,
  isLoading = false,
}: BankQuestionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleFilterChange = () => {
    if (!onFilterChange) return;

    const filters: QuestionFilters = {};
    if (typeFilter !== 'all') {
      filters.types = [typeFilter];
    }
    if (difficultyFilter !== 'all') {
      filters.difficulties = [difficultyFilter as 'easy' | 'medium' | 'hard'];
    }
    if (searchQuery.trim()) {
      filters.searchQuery = searchQuery;
    }
    onFilterChange(filters);
  };

  const handleDelete = async (questionId: string) => {
    try {
      await onDeleteQuestion(questionId);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (typeFilter !== 'all' && q.content.type !== typeFilter) return false;
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase();
      return (
        q.prompt.toLowerCase().includes(search) ||
        q.tags.some((t) => t.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const stats = {
    easy: questions.filter((q) => q.difficulty === 'easy').length,
    medium: questions.filter((q) => q.difficulty === 'medium').length,
    hard: questions.filter((q) => q.difficulty === 'hard').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{bank.name}</h2>
            {bank.description && (
              <p className="text-sm text-slate-500 mt-1">{bank.description}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onAddQuestion}
          className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Question
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-bold text-slate-900">{questions.length}</div>
          <div className="text-sm text-slate-500">Total Questions</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-2xl font-bold text-green-700">{stats.easy}</div>
          <div className="text-sm text-green-600">Easy</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-2xl font-bold text-amber-700">{stats.medium}</div>
          <div className="text-sm text-amber-600">Medium</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="text-2xl font-bold text-red-700">{stats.hard}</div>
          <div className="text-sm text-red-600">Hard</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 rounded-xl p-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions or tags..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
            />
          </div>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as QuestionType | 'all')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
        >
          <option value="all">All Types</option>
          {(Object.keys(QUESTION_TYPE_CONFIG) as QuestionType[]).map((type) => (
            <option key={type} value={type}>
              {QUESTION_TYPE_CONFIG[type].label}
            </option>
          ))}
        </select>
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-3xl text-msu-maroon">
            progress_activity
          </span>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-slate-400">
              {questions.length === 0 ? 'help' : 'search_off'}
            </span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {questions.length === 0 ? 'No Questions Yet' : 'No Matching Questions'}
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {questions.length === 0
              ? 'Add your first question to this bank'
              : 'Try adjusting your search or filters'}
          </p>
          {questions.length === 0 && (
            <button
              type="button"
              onClick={onAddQuestion}
              className="inline-flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add First Question
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((question, index) => {
            const typeConfig = QUESTION_TYPE_CONFIG[question.content.type as QuestionType];
            const isExpanded = expandedId === question.id;

            return (
              <div
                key={question.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                {/* Delete Confirmation */}
                {deleteConfirmId === question.id && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 backdrop-blur-sm">
                    <div className="text-center p-6">
                      <span className="material-symbols-outlined text-4xl text-red-500 mb-3">
                        warning
                      </span>
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        Delete this question?
                      </p>
                      <p className="text-xs text-slate-500 mb-4">This action cannot be undone</p>
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(question.id)}
                          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Question Header */}
                <div
                  className="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50"
                  onClick={() => setExpandedId(isExpanded ? null : question.id)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
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
                      <span className="text-xs text-slate-500">
                        {question.points} pt{question.points !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className={`text-sm text-slate-900 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {question.prompt}
                    </p>
                    {question.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditQuestion(question);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-msu-maroon"
                      title="Edit question"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(question.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                      title="Delete question"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                    <span
                      className={`material-symbols-outlined text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4">
                    {question.explanation && (
                      <div className="rounded-lg bg-blue-50 p-3 mb-3">
                        <div className="flex items-center gap-2 text-blue-700 mb-1">
                          <span className="material-symbols-outlined text-lg">lightbulb</span>
                          <span className="font-medium text-sm">Explanation</span>
                        </div>
                        <p className="text-sm text-blue-600">{question.explanation}</p>
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      Created: {new Date(question.createdAt).toLocaleDateString()}
                      {question.updatedAt !== question.createdAt && (
                        <> | Updated: {new Date(question.updatedAt).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
