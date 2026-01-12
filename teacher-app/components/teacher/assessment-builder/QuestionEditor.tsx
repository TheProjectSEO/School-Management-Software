'use client';

import { useState, useEffect } from 'react';
import {
  QuestionType,
  QuestionContent,
  DifficultyLevel,
  CreateQuestionInput,
  QUESTION_TYPE_CONFIG,
  createDefaultContent,
  generateId,
  MultipleChoiceContent,
  TrueFalseContent,
  ShortAnswerContent,
  EssayContent,
  MatchingContent,
  FillInBlankContent,
} from '@/teacher-app/lib/types/assessment-builder';
import {
  MultipleChoiceEditor,
  TrueFalseEditor,
  ShortAnswerEditor,
  EssayEditor,
  MatchingEditor,
  FillInBlankEditor,
} from './editors';

interface QuestionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: CreateQuestionInput) => void;
  initialValue?: CreateQuestionInput | null;
  isLoading?: boolean;
  saveToBank?: boolean;
}

export function QuestionEditor({
  isOpen,
  onClose,
  onSave,
  initialValue,
  isLoading = false,
  saveToBank = false,
}: QuestionEditorProps) {
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice_single');
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState<QuestionContent>(createDefaultContent('multiple_choice_single'));
  const [explanation, setExplanation] = useState('');
  const [points, setPoints] = useState(1);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(!initialValue);

  // Initialize from existing value
  useEffect(() => {
    if (initialValue) {
      setPrompt(initialValue.prompt);
      setContent(initialValue.content);
      setExplanation(initialValue.explanation || '');
      setPoints(initialValue.points);
      setDifficulty(initialValue.difficulty);
      setTags(initialValue.tags || []);
      setQuestionType(initialValue.content.type as QuestionType);
      setShowTypeSelector(false);
    } else {
      // Reset to defaults
      setPrompt('');
      setContent(createDefaultContent('multiple_choice_single'));
      setExplanation('');
      setPoints(1);
      setDifficulty('medium');
      setTags([]);
      setQuestionType('multiple_choice_single');
      setShowTypeSelector(true);
    }
  }, [initialValue, isOpen]);

  const handleTypeChange = (type: QuestionType) => {
    setQuestionType(type);
    setContent(createDefaultContent(type));
    setShowTypeSelector(false);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = () => {
    const question: CreateQuestionInput = {
      prompt,
      content,
      explanation: explanation || undefined,
      points,
      difficulty,
      tags,
    };
    onSave(question);
  };

  const isValid = () => {
    if (!prompt.trim()) return false;

    // Type-specific validation
    switch (content.type) {
      case 'multiple_choice_single':
      case 'multiple_choice_multi':
        const mcContent = content as MultipleChoiceContent;
        return mcContent.options.some((o) => o.isCorrect) &&
               mcContent.options.every((o) => o.text.trim());
      case 'true_false':
        return true; // Always valid
      case 'short_answer':
        const saContent = content as ShortAnswerContent;
        return saContent.expectedAnswers.some((a) => a.trim());
      case 'essay':
        return true; // Always valid
      case 'matching':
        const matchContent = content as MatchingContent;
        return matchContent.pairs.length >= 2 &&
               matchContent.pairs.every((p) => p.left.trim() && p.right.trim());
      case 'fill_in_blank':
        const fibContent = content as FillInBlankContent;
        return fibContent.blanks.length > 0 &&
               fibContent.blanks.every((b) => b.acceptedAnswers.some((a) => a.trim()));
      default:
        return false;
    }
  };

  const renderTypeSpecificEditor = () => {
    switch (content.type) {
      case 'multiple_choice_single':
      case 'multiple_choice_multi':
        return (
          <MultipleChoiceEditor
            value={content as MultipleChoiceContent}
            onChange={(c) => setContent(c)}
            disabled={isLoading}
          />
        );
      case 'true_false':
        return (
          <TrueFalseEditor
            value={content as TrueFalseContent}
            onChange={(c) => setContent(c)}
            disabled={isLoading}
          />
        );
      case 'short_answer':
        return (
          <ShortAnswerEditor
            value={content as ShortAnswerContent}
            onChange={(c) => setContent(c)}
            disabled={isLoading}
          />
        );
      case 'essay':
        return (
          <EssayEditor
            value={content as EssayContent}
            onChange={(c) => setContent(c)}
            disabled={isLoading}
          />
        );
      case 'matching':
        return (
          <MatchingEditor
            value={content as MatchingContent}
            onChange={(c) => setContent(c)}
            disabled={isLoading}
          />
        );
      case 'fill_in_blank':
        return (
          <FillInBlankEditor
            value={content as FillInBlankContent}
            onChange={(c) => setContent(c)}
            disabled={isLoading}
          />
        );
      default:
        return null;
    }
  };

  const renderPreview = () => {
    const typeConfig = QUESTION_TYPE_CONFIG[questionType];

    return (
      <div className="space-y-6">
        {/* Question Header */}
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${typeConfig.color}-100`}>
            <span className={`material-symbols-outlined text-${typeConfig.color}-600`}>
              {typeConfig.icon}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-slate-500 uppercase">
                {typeConfig.label}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {difficulty}
              </span>
              <span className="text-xs text-slate-500">{points} pt{points !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-slate-900 font-medium">{prompt || 'Question prompt will appear here...'}</p>
          </div>
        </div>

        {/* Answer Area Preview */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500 mb-4">Student answer area:</p>
          {renderAnswerPreview()}
        </div>

        {/* Explanation */}
        {explanation && (
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <span className="material-symbols-outlined text-lg">lightbulb</span>
              <span className="font-medium text-sm">Explanation</span>
            </div>
            <p className="text-sm text-blue-600">{explanation}</p>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAnswerPreview = () => {
    switch (content.type) {
      case 'multiple_choice_single':
      case 'multiple_choice_multi':
        const mcContent = content as MultipleChoiceContent;
        return (
          <div className="space-y-2">
            {mcContent.options.map((opt, i) => (
              <div
                key={opt.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  content.type === 'multiple_choice_multi'
                    ? 'border-slate-300'
                    : 'border-slate-300 rounded-full'
                }`}>
                  {content.type === 'multiple_choice_multi' ? '' : ''}
                </span>
                <span className="text-sm text-slate-700">{opt.text || `Option ${String.fromCharCode(65 + i)}`}</span>
              </div>
            ))}
          </div>
        );
      case 'true_false':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center">
              <span className="text-sm font-medium text-slate-700">True</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center">
              <span className="text-sm font-medium text-slate-700">False</span>
            </div>
          </div>
        );
      case 'short_answer':
        return (
          <input
            type="text"
            disabled
            placeholder="Student types their answer here..."
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400"
          />
        );
      case 'essay':
        return (
          <textarea
            disabled
            placeholder="Student writes their essay response here..."
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 resize-none"
          />
        );
      case 'matching':
        const matchContent = content as MatchingContent;
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {matchContent.pairs.slice(0, 3).map((p, i) => (
                <div key={p.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  {p.left || `Item ${i + 1}`}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {matchContent.pairs.slice(0, 3).map((p, i) => (
                <div key={p.id} className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-400">
                  Drop match here
                </div>
              ))}
            </div>
          </div>
        );
      case 'fill_in_blank':
        const fibContent = content as FillInBlankContent;
        return (
          <p className="text-sm text-slate-700">
            {fibContent.textWithBlanks.split(/\[blank(?::[a-zA-Z0-9_]+)?\]/).map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="inline-block mx-1 min-w-[60px] border-b-2 border-slate-300 px-2">
                    ____
                  </span>
                )}
              </span>
            ))}
          </p>
        );
      default:
        return null;
    }
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
      <div className="absolute inset-4 md:inset-8 lg:inset-12 flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-msu-maroon/10">
              <span className="material-symbols-outlined text-msu-maroon">
                {initialValue ? 'edit' : 'add_circle'}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {initialValue ? 'Edit Question' : 'Create Question'}
              </h2>
              <p className="text-sm text-slate-500">
                {saveToBank ? 'Save to question bank' : 'Add to assessment'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Preview Toggle */}
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isPreviewMode
                  ? 'bg-msu-maroon text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {isPreviewMode ? 'edit' : 'visibility'}
              </span>
              {isPreviewMode ? 'Edit' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showTypeSelector ? (
            // Type Selector
            <div className="max-w-3xl mx-auto">
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Select Question Type
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Choose the type of question you want to create
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(Object.keys(QUESTION_TYPE_CONFIG) as QuestionType[]).map((type) => {
                  const config = QUESTION_TYPE_CONFIG[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 p-6 text-center hover:border-msu-maroon hover:bg-msu-maroon/5 transition-all"
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100`}>
                        <span className="material-symbols-outlined text-2xl text-slate-600">
                          {config.icon}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{config.label}</p>
                        <p className="text-xs text-slate-500 mt-1">{config.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : isPreviewMode ? (
            // Preview Mode
            <div className="max-w-3xl mx-auto">
              <div className="rounded-xl border border-slate-200 p-6">
                {renderPreview()}
              </div>
            </div>
          ) : (
            // Edit Mode
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Question Type Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <span className="material-symbols-outlined text-slate-600">
                      {QUESTION_TYPE_CONFIG[questionType].icon}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {QUESTION_TYPE_CONFIG[questionType].label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {QUESTION_TYPE_CONFIG[questionType].description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTypeSelector(true)}
                  className="text-sm text-msu-maroon hover:underline"
                >
                  Change type
                </button>
              </div>

              {/* Question Prompt */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Question Prompt <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your question here..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon resize-none"
                />
              </div>

              {/* Type-specific Editor */}
              <div className="rounded-xl border border-slate-200 p-5">
                {renderTypeSpecificEditor()}
              </div>

              {/* Points and Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Points
                  </label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={isLoading}
                    min="0"
                    step="1"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Difficulty
                  </label>
                  <div className="flex gap-2">
                    {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        disabled={isLoading}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                          difficulty === level
                            ? level === 'easy'
                              ? 'bg-green-500 text-white'
                              : level === 'medium'
                              ? 'bg-amber-500 text-white'
                              : 'bg-red-500 text-white'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Explanation <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  disabled={isLoading}
                  placeholder="Provide an explanation that students will see after answering..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    disabled={isLoading}
                    placeholder="Add a tag..."
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={isLoading || !tagInput.trim()}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !isValid() || showTypeSelector}
            className="flex items-center gap-2 rounded-lg bg-msu-maroon px-5 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">save</span>
                {saveToBank ? 'Save to Bank' : 'Add Question'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
