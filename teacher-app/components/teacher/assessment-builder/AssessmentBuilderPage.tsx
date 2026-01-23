'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Assessment,
  AssessmentQuestion,
  AssessmentSettings,
  AssessmentType,
  AssessmentStatus,
  BankRule,
  BankRuleInput,
  CreateQuestionInput,
  QuestionBank,
  BankQuestion,
  generateId,
} from '@/lib/types/assessment-builder';
import { QuestionList } from './QuestionList';
import { QuestionEditor } from './QuestionEditor';
import { BankRulesPanel } from './BankRulesPanel';
import { QuestionBankSelector } from './bank/QuestionBankSelector';

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'settings' | 'questions' | 'bank-rules' | 'preview';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'questions', label: 'Questions', icon: 'quiz' },
  { id: 'bank-rules', label: 'Bank Rules', icon: 'shuffle' },
  { id: 'preview', label: 'Preview', icon: 'visibility' },
];

const ASSESSMENT_TYPES: { value: AssessmentType; label: string }[] = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'project', label: 'Project' },
  { value: 'midterm', label: 'Midterm Exam' },
  { value: 'final', label: 'Final Exam' },
];

interface AssessmentBuilderPageProps {
  assessmentId: string;
  initialAssessment?: Assessment;
  initialQuestions?: AssessmentQuestion[];
  initialBankRules?: BankRule[];
  availableBanks?: QuestionBank[];
  onSave?: (assessment: Partial<Assessment>) => Promise<void>;
  onPublish?: () => Promise<void>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AssessmentBuilderPage({
  assessmentId,
  initialAssessment,
  initialQuestions = [],
  initialBankRules = [],
  availableBanks = [],
  onSave,
  onPublish,
}: AssessmentBuilderPageProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('settings');

  // Assessment state
  const [assessment, setAssessment] = useState<Partial<Assessment>>(() => ({
    id: assessmentId,
    title: '',
    description: '',
    instructions: '',
    type: 'quiz',
    status: 'draft',
    timeLimit: undefined,
    attemptsAllowed: 1,
    allowResubmission: false,
    settings: {
      shuffleQuestions: false,
      shuffleChoices: false,
      showResults: 'immediately',
      showCorrectAnswers: true,
      allowBackNavigation: true,
      showQuestionNumbers: true,
      passwordProtected: false,
      browserLockdown: false,
    },
    ...initialAssessment,
  }));

  // Questions state
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(initialQuestions);
  const [bankRules, setBankRules] = useState<BankRule[]>(initialBankRules);

  // UI state
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AssessmentQuestion | null>(null);
  const [showBankSelector, setShowBankSelector] = useState(false);

  // Calculate totals
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const questionCount = questions.length;

  // Mark as dirty on any change
  useEffect(() => {
    setIsDirty(true);
  }, [assessment, questions, bankRules]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSettingsChange = useCallback((field: string, value: unknown) => {
    setAssessment((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleAdvancedSettingsChange = useCallback((field: keyof AssessmentSettings, value: unknown) => {
    setAssessment((prev) => ({
      ...prev,
      settings: {
        ...prev.settings!,
        [field]: value,
      },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave({
        ...assessment,
        totalPoints,
        questionCount,
      });
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [assessment, onSave, totalPoints, questionCount]);

  const handlePublish = useCallback(async () => {
    if (!onPublish) return;
    setIsSaving(true);
    try {
      await onPublish();
      setAssessment((prev) => ({ ...prev, status: 'published' }));
    } catch (error) {
      console.error('Failed to publish:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onPublish]);

  // Question handlers
  const handleAddQuestion = useCallback(() => {
    setEditingQuestion(null);
    setShowQuestionEditor(true);
  }, []);

  const handleEditQuestion = useCallback((question: AssessmentQuestion) => {
    setEditingQuestion(question);
    setShowQuestionEditor(true);
  }, []);

  const handleSaveQuestion = useCallback((input: CreateQuestionInput) => {
    if (editingQuestion) {
      // Update existing
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editingQuestion.id
            ? {
                ...q,
                prompt: input.prompt,
                content: input.content,
                explanation: input.explanation,
                points: input.points,
                difficulty: input.difficulty,
                tags: input.tags || [],
                updatedAt: new Date().toISOString(),
              }
            : q
        )
      );
    } else {
      // Create new
      const newQuestion: AssessmentQuestion = {
        id: generateId(),
        assessmentId,
        prompt: input.prompt,
        content: input.content,
        explanation: input.explanation,
        points: input.points,
        difficulty: input.difficulty,
        tags: input.tags || [],
        orderIndex: questions.length,
        createdBy: '', // Will be set by server
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setQuestions((prev) => [...prev, newQuestion]);
    }
    setShowQuestionEditor(false);
    setEditingQuestion(null);
  }, [assessmentId, editingQuestion, questions.length]);

  const handleDeleteQuestion = useCallback((questionId: string) => {
    setQuestions((prev) =>
      prev.filter((q) => q.id !== questionId).map((q, idx) => ({
        ...q,
        orderIndex: idx,
      }))
    );
  }, []);

  const handleDuplicateQuestion = useCallback((question: AssessmentQuestion) => {
    const duplicate: AssessmentQuestion = {
      ...question,
      id: generateId(),
      bankQuestionId: undefined, // Not from bank anymore
      orderIndex: questions.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setQuestions((prev) => [...prev, duplicate]);
  }, [questions.length]);

  const handleReorderQuestions = useCallback((reorderedQuestions: AssessmentQuestion[]) => {
    setQuestions(reorderedQuestions);
  }, []);

  // Bank selector handlers
  const handleAddFromBank = useCallback(() => {
    setShowBankSelector(true);
  }, []);

  const handleImportFromBank = useCallback((bankQuestions: BankQuestion[]) => {
    const newQuestions: AssessmentQuestion[] = bankQuestions.map((bq, idx) => ({
      id: generateId(),
      assessmentId,
      bankQuestionId: bq.id,
      prompt: bq.prompt,
      content: bq.content,
      explanation: bq.explanation,
      points: bq.points,
      difficulty: bq.difficulty,
      tags: bq.tags,
      orderIndex: questions.length + idx,
      createdBy: bq.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setQuestions((prev) => [...prev, ...newQuestions]);
    setShowBankSelector(false);
  }, [assessmentId, questions.length]);

  // Bank rules handlers
  const handleAddBankRule = useCallback((rule: BankRuleInput) => {
    const newRule: BankRule = {
      bankId: rule.bankId,
      pickCount: rule.pickCount,
      tagFilters: rule.tagFilters || [],
      difficultyFilter: rule.difficultyFilter || [],
      shuffleQuestions: rule.shuffleQuestions ?? true,
      shuffleChoices: rule.shuffleChoices ?? true,
      seedMode: rule.seedMode ?? 'per_student',
      id: generateId(),
      assessmentId,
      createdAt: new Date().toISOString(),
    };
    setBankRules((prev) => [...prev, newRule]);
  }, [assessmentId]);

  const handleUpdateBankRule = useCallback((ruleId: string, updates: Partial<BankRule>) => {
    setBankRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, ...updates } : r))
    );
  }, []);

  const handleDeleteBankRule = useCallback((ruleId: string) => {
    setBankRules((prev) => prev.filter((r) => r.id !== ruleId));
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assessment Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={assessment.title || ''}
              onChange={(e) => handleSettingsChange('title', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
              placeholder="Enter assessment title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assessment Type
            </label>
            <select
              value={assessment.type || 'quiz'}
              onChange={(e) => handleSettingsChange('type', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
            >
              {ASSESSMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={assessment.description || ''}
              onChange={(e) => handleSettingsChange('description', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
              placeholder="Brief description of the assessment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Instructions for Students
            </label>
            <textarea
              value={assessment.instructions || ''}
              onChange={(e) => handleSettingsChange('instructions', e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
              placeholder="Instructions that students will see before starting"
            />
          </div>
        </div>
      </div>

      {/* Time & Attempts */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Time & Attempts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Time Limit (minutes)
            </label>
            <input
              type="number"
              value={assessment.timeLimit || ''}
              onChange={(e) => handleSettingsChange('timeLimit', e.target.value ? Number(e.target.value) : undefined)}
              min="0"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
              placeholder="No limit"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Attempts Allowed
            </label>
            <input
              type="number"
              value={assessment.attemptsAllowed || 1}
              onChange={(e) => handleSettingsChange('attemptsAllowed', Math.max(1, Number(e.target.value)))}
              min="1"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
            />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="allowResubmission"
              checked={assessment.allowResubmission || false}
              onChange={(e) => handleSettingsChange('allowResubmission', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
            />
            <label htmlFor="allowResubmission" className="text-sm text-slate-700">
              Allow resubmission
            </label>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Display Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shuffleQuestions"
                checked={assessment.settings?.shuffleQuestions || false}
                onChange={(e) => handleAdvancedSettingsChange('shuffleQuestions', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
              />
              <label htmlFor="shuffleQuestions" className="text-sm text-slate-700">
                Shuffle question order
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shuffleChoices"
                checked={assessment.settings?.shuffleChoices || false}
                onChange={(e) => handleAdvancedSettingsChange('shuffleChoices', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
              />
              <label htmlFor="shuffleChoices" className="text-sm text-slate-700">
                Shuffle answer choices
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowBackNavigation"
                checked={assessment.settings?.allowBackNavigation || false}
                onChange={(e) => handleAdvancedSettingsChange('allowBackNavigation', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
              />
              <label htmlFor="allowBackNavigation" className="text-sm text-slate-700">
                Allow back navigation
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showQuestionNumbers"
                checked={assessment.settings?.showQuestionNumbers !== false}
                onChange={(e) => handleAdvancedSettingsChange('showQuestionNumbers', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
              />
              <label htmlFor="showQuestionNumbers" className="text-sm text-slate-700">
                Show question numbers
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              When to show results
            </label>
            <select
              value={assessment.settings?.showResults || 'immediately'}
              onChange={(e) => handleAdvancedSettingsChange('showResults', e.target.value)}
              className="w-full md:w-64 rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
            >
              <option value="immediately">Immediately after submission</option>
              <option value="after_due_date">After due date</option>
              <option value="never">Never (manual release)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showCorrectAnswers"
              checked={assessment.settings?.showCorrectAnswers || false}
              onChange={(e) => handleAdvancedSettingsChange('showCorrectAnswers', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
            />
            <label htmlFor="showCorrectAnswers" className="text-sm text-slate-700">
              Show correct answers in results
            </label>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Security Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="passwordProtected"
              checked={assessment.settings?.passwordProtected || false}
              onChange={(e) => handleAdvancedSettingsChange('passwordProtected', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
            />
            <label htmlFor="passwordProtected" className="text-sm text-slate-700">
              Require password to access
            </label>
          </div>

          {assessment.settings?.passwordProtected && (
            <div className="ml-6">
              <input
                type="text"
                value={assessment.settings?.password || ''}
                onChange={(e) => handleAdvancedSettingsChange('password', e.target.value)}
                className="w-full md:w-64 rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
                placeholder="Enter access password"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="browserLockdown"
              checked={assessment.settings?.browserLockdown || false}
              onChange={(e) => handleAdvancedSettingsChange('browserLockdown', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
            />
            <label htmlFor="browserLockdown" className="text-sm text-slate-700">
              Enable browser lockdown mode
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuestionsTab = () => (
    <QuestionList
      questions={questions}
      onReorder={handleReorderQuestions}
      onEditQuestion={handleEditQuestion}
      onDeleteQuestion={handleDeleteQuestion}
      onDuplicateQuestion={handleDuplicateQuestion}
      onAddQuestion={handleAddQuestion}
      onAddFromBank={handleAddFromBank}
    />
  );

  const renderBankRulesTab = () => (
    <BankRulesPanel
      rules={bankRules}
      banks={availableBanks}
      onAddRule={handleAddBankRule}
      onUpdateRule={handleUpdateBankRule}
      onDeleteRule={handleDeleteBankRule}
    />
  );

  const renderPreviewTab = () => (
    <div className="space-y-6">
      {/* Preview Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {assessment.title || 'Untitled Assessment'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {ASSESSMENT_TYPES.find((t) => t.value === assessment.type)?.label || 'Quiz'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-msu-maroon">{totalPoints}</div>
            <div className="text-sm text-slate-500">Total Points</div>
          </div>
        </div>

        {assessment.description && (
          <p className="text-sm text-slate-600 mb-4">{assessment.description}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          {assessment.timeLimit && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">timer</span>
              {assessment.timeLimit} minutes
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">quiz</span>
            {questionCount} questions
          </div>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">replay</span>
            {assessment.attemptsAllowed} attempt{assessment.attemptsAllowed !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Instructions */}
      {assessment.instructions && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600">info</span>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Instructions</h3>
              <p className="text-sm text-blue-700 whitespace-pre-wrap">{assessment.instructions}</p>
            </div>
          </div>
        </div>
      )}

      {/* Questions Preview */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Questions Preview</h3>
        {questions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">quiz</span>
            <p className="text-sm text-slate-500">No questions added yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-msu-maroon/10 text-sm font-semibold text-msu-maroon shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-900 mb-4">{question.prompt}</p>
                    {/* Render preview based on type */}
                    {renderQuestionPreview(question)}
                  </div>
                  <div className="text-sm text-slate-500 shrink-0">
                    {question.points} pt{question.points !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bank Rules Summary */}
      {bankRules.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600">shuffle</span>
            <div>
              <h3 className="text-sm font-semibold text-amber-900 mb-2">Random Questions</h3>
              <p className="text-sm text-amber-700">
                {bankRules.reduce((sum, r) => sum + r.pickCount, 0)} additional questions will be randomly selected from question banks.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderQuestionPreview = (question: AssessmentQuestion) => {
    switch (question.content.type) {
      case 'multiple_choice_single':
      case 'multiple_choice_multi':
        return (
          <div className="space-y-2">
            {question.content.options.map((opt, i) => (
              <div
                key={opt.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt.text || '(Empty option)'}</span>
              </div>
            ))}
          </div>
        );
      case 'true_false':
        return (
          <div className="flex gap-4">
            <button className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium">
              True
            </button>
            <button className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium">
              False
            </button>
          </div>
        );
      case 'short_answer':
        return (
          <input
            type="text"
            disabled
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm bg-slate-50"
            placeholder="Student answer here..."
          />
        );
      case 'essay':
        return (
          <textarea
            disabled
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm bg-slate-50"
            placeholder="Student essay response..."
          />
        );
      case 'matching':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {question.content.pairs.map((pair, i) => (
                <div key={pair.id} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
                  {i + 1}. {pair.left || '(Empty)'}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {question.content.pairs.map((pair, i) => (
                <div key={pair.id} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
                  {String.fromCharCode(65 + i)}. {pair.right || '(Empty)'}
                </div>
              ))}
            </div>
          </div>
        );
      case 'fill_in_blank':
        return (
          <div className="text-sm text-slate-700">
            {question.content.textWithBlanks.split(/\[blank(?::\w+)?\]/).map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <input
                    type="text"
                    disabled
                    className="inline-block w-32 mx-1 rounded border border-slate-300 px-2 py-1 text-sm bg-slate-50"
                    placeholder="..."
                  />
                )}
              </span>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {assessment.title || 'New Assessment'}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      assessment.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : assessment.status === 'closed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {assessment.status || 'draft'}
                  </span>
                  <span className="text-sm text-slate-500">
                    {questionCount} questions | {totalPoints} points
                  </span>
                  {isDirty && (
                    <span className="text-xs text-amber-600">(unsaved changes)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                ) : (
                  <span className="material-symbols-outlined text-lg">save</span>
                )}
                Save Draft
              </button>
              {assessment.status === 'draft' && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isSaving || questionCount === 0}
                  className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">publish</span>
                  Publish
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-msu-maroon text-msu-maroon'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
                {tab.id === 'questions' && questionCount > 0 && (
                  <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {questionCount}
                  </span>
                )}
                {tab.id === 'bank-rules' && bankRules.length > 0 && (
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    {bankRules.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'questions' && renderQuestionsTab()}
        {activeTab === 'bank-rules' && renderBankRulesTab()}
        {activeTab === 'preview' && renderPreviewTab()}
      </div>

      {/* Question Editor Modal */}
      <QuestionEditor
        isOpen={showQuestionEditor}
        initialValue={
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
        onClose={() => {
          setShowQuestionEditor(false);
          setEditingQuestion(null);
        }}
      />

      {/* Bank Selector Modal */}
      {showBankSelector && (
        <QuestionBankSelector
          banks={availableBanks}
          onSelect={handleImportFromBank}
          onClose={() => setShowBankSelector(false)}
        />
      )}
    </div>
  );
}
