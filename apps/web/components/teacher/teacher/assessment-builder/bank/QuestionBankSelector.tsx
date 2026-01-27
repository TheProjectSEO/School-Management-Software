'use client';

import { useState, useEffect } from 'react';
import { QuestionBank, BankQuestion, QuestionFilters, QUESTION_TYPE_CONFIG, QuestionType } from '@/lib/types/assessment-builder';

interface QuestionBankSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuestions: (questions: BankQuestion[]) => void;
  banks: QuestionBank[];
  onLoadBankQuestions: (bankId: string, filters?: QuestionFilters) => Promise<BankQuestion[]>;
}

export function QuestionBankSelector({
  isOpen,
  onClose,
  onSelectQuestions,
  banks,
  onLoadBankQuestions,
}: QuestionBankSelectorProps) {
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  // Load questions when bank is selected
  useEffect(() => {
    if (selectedBank) {
      loadQuestions();
    }
  }, [selectedBank, typeFilter, difficultyFilter]);

  const loadQuestions = async () => {
    if (!selectedBank) return;

    setIsLoading(true);
    try {
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

      const loadedQuestions = await onLoadBankQuestions(selectedBank.id, filters);
      setQuestions(loadedQuestions);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    loadQuestions();
  };

  const toggleQuestionSelection = (questionId: string) => {
    const newSelection = new Set(selectedQuestions);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestions(newSelection);
  };

  const selectAll = () => {
    setSelectedQuestions(new Set(questions.map((q) => q.id)));
  };

  const deselectAll = () => {
    setSelectedQuestions(new Set());
  };

  const handleAddSelected = () => {
    const selected = questions.filter((q) => selectedQuestions.has(q.id));
    onSelectQuestions(selected);
    onClose();
  };

  const goBack = () => {
    setSelectedBank(null);
    setQuestions([]);
    setSelectedQuestions(new Set());
    setSearchQuery('');
    setTypeFilter('all');
    setDifficultyFilter('all');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-16 flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            {selectedBank && (
              <button
                type="button"
                onClick={goBack}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-msu-maroon/10">
              <span className="material-symbols-outlined text-msu-maroon">quiz</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedBank ? selectedBank.name : 'Question Banks'}
              </h2>
              <p className="text-sm text-slate-500">
                {selectedBank
                  ? `${questions.length} questions available`
                  : 'Select a bank to browse questions'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedBank ? (
            // Banks List
            <div className="space-y-4">
              {banks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-400">folder_off</span>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Question Banks</h3>
                  <p className="text-sm text-slate-500">
                    Create a question bank first to add questions
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {banks.map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className="flex flex-col items-start rounded-xl border border-slate-200 p-5 text-left hover:border-msu-maroon hover:bg-msu-maroon/5 transition-all group"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-msu-maroon/10 mb-3">
                        <span className="material-symbols-outlined text-slate-600 group-hover:text-msu-maroon">
                          folder
                        </span>
                      </div>
                      <h3 className="font-medium text-slate-900 group-hover:text-msu-maroon mb-1">
                        {bank.name}
                      </h3>
                      {bank.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                          {bank.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-auto">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          <span className="material-symbols-outlined text-sm">help</span>
                          {bank.questionCount} questions
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Questions List
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search questions..."
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
                    />
                  </div>
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as QuestionType | 'all')}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
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
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Selection Actions */}
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-sm text-msu-maroon hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-sm text-msu-maroon hover:underline"
                  >
                    Deselect all
                  </button>
                </div>
                <span className="text-sm text-slate-600">
                  {selectedQuestions.size} selected
                </span>
              </div>

              {/* Questions */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="material-symbols-outlined animate-spin text-3xl text-msu-maroon">
                    progress_activity
                  </span>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-400">
                      search_off
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Questions Found</h3>
                  <p className="text-sm text-slate-500">
                    Try adjusting your filters or add questions to this bank
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {questions.map((question) => {
                    const typeConfig = QUESTION_TYPE_CONFIG[question.content.type as QuestionType];
                    const isSelected = selectedQuestions.has(question.id);

                    return (
                      <div
                        key={question.id}
                        onClick={() => toggleQuestionSelection(question.id)}
                        className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-msu-maroon bg-msu-maroon/5'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-colors ${
                            isSelected
                              ? 'border-msu-maroon bg-msu-maroon text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && (
                            <span className="material-symbols-outlined text-sm">check</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
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
                          <p className="text-sm text-slate-900 line-clamp-2">{question.prompt}</p>
                          {question.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {question.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {question.tags.length > 3 && (
                                <span className="text-xs text-slate-400">
                                  +{question.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedBank && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
            <button
              type="button"
              onClick={goBack}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to Banks
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={selectedQuestions.size === 0}
              className="flex items-center gap-2 rounded-lg bg-msu-maroon px-5 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
