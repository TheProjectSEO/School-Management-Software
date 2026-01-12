'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  QuestionBank,
  BankQuestion,
  CreateQuestionInput,
  QuestionType,
  QUESTION_TYPE_CONFIG,
  DifficultyLevel,
} from '@/teacher-app/lib/types/assessment-builder';
import {
  getBankQuestions,
  addQuestionToBank,
  deleteBankQuestion,
  importQuestionsToBank,
} from '@/teacher-app/lib/dal/assessment-builder';
import { QuestionEditor } from '@/teacher-app/components/teacher/assessment-builder/QuestionEditor';
import { QuestionImportModal } from '@/teacher-app/components/teacher/assessment-builder/bank/QuestionImportModal';

export default function QuestionBankDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bankId = params.bankId as string;

  const [loading, setLoading] = useState(true);
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuestionType | ''>('');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | ''>('');

  // Modal states
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load bank and questions
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch bank details
      const bankRes = await fetch(`/api/teacher/question-banks/${bankId}`);
      if (bankRes.ok) {
        const data = await bankRes.json();
        setBank(data.bank);
      }

      // Fetch questions
      const result = await getBankQuestions(bankId, {
        types: typeFilter ? [typeFilter] : undefined,
        difficulties: difficultyFilter ? [difficultyFilter] : undefined,
        searchQuery: searchQuery || undefined,
      });

      if (!result.error && result.data) {
        setQuestions(result.data.questions || []);
      }
    } catch (err) {
      console.error('Error loading bank:', err);
    } finally {
      setLoading(false);
    }
  }, [bankId, typeFilter, difficultyFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add question
  const handleSaveQuestion = async (input: CreateQuestionInput) => {
    setSaving(true);
    const result = await addQuestionToBank(bankId, input);
    if (!result.error && result.data) {
      setQuestions((prev) => [result.data!.question, ...prev]);
      setShowQuestionEditor(false);
      setEditingQuestion(null);
    }
    setSaving(false);
  };

  // Delete question
  const handleDeleteQuestion = async (questionId: string) => {
    setDeleting(true);
    const result = await deleteBankQuestion(bankId, questionId);
    if (!result.error) {
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setShowDeleteConfirm(null);
    }
    setDeleting(false);
  };

  // Import questions
  const handleImport = async (importedQuestions: CreateQuestionInput[]) => {
    const result = await importQuestionsToBank(bankId, importedQuestions, 'json');
    if (!result.error) {
      // Reload questions after import
      loadData();
    }
    setShowImportModal(false);
  };

  // Toggle question expansion
  const toggleExpand = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!q.prompt.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  // Stats
  const stats = {
    total: questions.length,
    byType: questions.reduce((acc, q) => {
      const type = q.content.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byDifficulty: questions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  if (loading && !bank) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-msu-maroon mx-auto mb-4"></div>
          <p className="text-slate-500">Loading question bank...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{bank?.name || 'Question Bank'}</h1>
              {bank?.description && (
                <p className="text-sm text-slate-500 mt-1">{bank.description}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 bg-slate-50 rounded-xl p-4 mb-4">
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              <div className="text-sm text-slate-500">Total Questions</div>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-green-700">
                Easy: {stats.byDifficulty.easy || 0}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                Medium: {stats.byDifficulty.medium || 0}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-red-700">
                Hard: {stats.byDifficulty.hard || 0}
              </span>
            </div>
          </div>

          {/* Actions and Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions..."
                  className="w-64 rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as QuestionType | '')}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
              >
                <option value="">All Types</option>
                {Object.entries(QUESTION_TYPE_CONFIG).map(([type, config]) => (
                  <option key={type} value={type}>
                    {config.label}
                  </option>
                ))}
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as DifficultyLevel | '')}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-lg">upload</span>
                Import
              </button>
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setShowQuestionEditor(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2 text-sm font-medium text-white hover:bg-msu-maroon/90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Add Question
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-msu-maroon mx-auto"></div>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-400">quiz</span>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Questions Yet</h3>
            <p className="text-sm text-slate-500 mb-4">
              Add questions to this bank to reuse them in assessments
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-lg">upload</span>
                Import Questions
              </button>
              <button
                onClick={() => setShowQuestionEditor(true)}
                className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Create Question
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((question, index) => {
              const typeConfig = QUESTION_TYPE_CONFIG[question.content.type as QuestionType];
              const isExpanded = expandedQuestions.has(question.id);

              return (
                <div
                  key={question.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
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
                        </div>

                        {/* Prompt */}
                        <p className={`text-sm text-slate-900 ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {question.prompt}
                        </p>

                        {/* Tags */}
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

                      {/* Actions */}
                      <div className="flex items-start gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleExpand(question.id)}
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
                          onClick={() => {
                            setEditingQuestion(question);
                            setShowQuestionEditor(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-msu-maroon"
                          title="Edit question"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(question.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                          title="Delete question"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Question Editor Modal */}
      {showQuestionEditor && (
        <QuestionEditor
          initialQuestion={
            editingQuestion
              ? {
                  prompt: editingQuestion.prompt,
                  content: editingQuestion.content,
                  explanation: editingQuestion.explanation,
                  points: editingQuestion.points,
                  difficulty: editingQuestion.difficulty,
                  tags: editingQuestion.tags,
                }
              : null
          }
          onSave={handleSaveQuestion}
          onCancel={() => {
            setShowQuestionEditor(false);
            setEditingQuestion(null);
          }}
          isLoading={saving}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <QuestionImportModal
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-red-600">warning</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Question?</h3>
            <p className="text-sm text-slate-500 mb-6">
              This will permanently delete this question from the bank.
              Assessments using this question will not be affected.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteQuestion(showDeleteConfirm)}
                disabled={deleting}
                className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
