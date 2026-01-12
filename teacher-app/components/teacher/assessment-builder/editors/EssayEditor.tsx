'use client';

import { EssayContent } from '@/teacher-app/lib/types/assessment-builder';

interface EssayEditorProps {
  value: EssayContent;
  onChange: (content: EssayContent) => void;
  disabled?: boolean;
}

export function EssayEditor({
  value,
  onChange,
  disabled = false,
}: EssayEditorProps) {
  const handleMinWordsChange = (minWords: string) => {
    const parsed = parseInt(minWords, 10);
    onChange({
      ...value,
      minWords: isNaN(parsed) || parsed <= 0 ? undefined : parsed,
    });
  };

  const handleMaxWordsChange = (maxWords: string) => {
    const parsed = parseInt(maxWords, 10);
    onChange({
      ...value,
      maxWords: isNaN(parsed) || parsed <= 0 ? undefined : parsed,
    });
  };

  const handleRubricChange = (rubricGuidelines: string) => {
    onChange({ ...value, rubricGuidelines });
  };

  const handleSampleAnswerChange = (sampleAnswer: string) => {
    onChange({ ...value, sampleAnswer });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400">article</span>
        <span className="text-sm font-medium text-slate-700">Essay Configuration</span>
      </div>

      {/* Word Limits */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-4">Word Limits</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Minimum Words
            </label>
            <div className="relative">
              <input
                type="number"
                value={value.minWords || ''}
                onChange={(e) => handleMinWordsChange(e.target.value)}
                disabled={disabled}
                placeholder="No minimum"
                min="0"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                words
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Maximum Words
            </label>
            <div className="relative">
              <input
                type="number"
                value={value.maxWords || ''}
                onChange={(e) => handleMaxWordsChange(e.target.value)}
                disabled={disabled}
                placeholder="No maximum"
                min="0"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                words
              </span>
            </div>
          </div>
        </div>
        {value.minWords && value.maxWords && value.minWords > value.maxWords && (
          <p className="mt-2 text-xs text-red-500">
            Minimum words cannot be greater than maximum words
          </p>
        )}
      </div>

      {/* Rubric Guidelines */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-700">Rubric / Grading Guidelines</h4>
          <span className="text-xs text-slate-400">Optional</span>
        </div>
        <textarea
          value={value.rubricGuidelines || ''}
          onChange={(e) => handleRubricChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter grading criteria, rubric points, or guidelines for evaluating this essay...

Example:
- Content & Relevance (40%): Response addresses the prompt directly
- Organization (25%): Clear introduction, body, and conclusion
- Grammar & Spelling (20%): Proper language mechanics
- Critical Thinking (15%): Evidence of analysis and original thought"
          rows={6}
          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon resize-none"
        />
        <p className="mt-2 text-xs text-slate-500">
          These guidelines will help with consistent grading and can be shown to students
        </p>
      </div>

      {/* Sample Answer */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-700">Sample Answer / Model Response</h4>
          <span className="text-xs text-slate-400">Optional</span>
        </div>
        <textarea
          value={value.sampleAnswer || ''}
          onChange={(e) => handleSampleAnswerChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter an ideal answer or model response that demonstrates what a perfect score should look like..."
          rows={5}
          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon resize-none"
        />
        <p className="mt-2 text-xs text-slate-500">
          This will not be shown to students but helps during grading
        </p>
      </div>

      {/* Student View Preview */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Student View Preview</h4>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 min-h-[120px]">
            <p className="text-sm text-slate-400 italic">
              Students will write their essay response here...
            </p>
          </div>
          {(value.minWords || value.maxWords) && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Word count: 0</span>
              <span>
                {value.minWords && value.maxWords
                  ? `Required: ${value.minWords}-${value.maxWords} words`
                  : value.minWords
                  ? `Minimum: ${value.minWords} words`
                  : `Maximum: ${value.maxWords} words`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3">
        <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">info</span>
        <div className="text-sm text-blue-700">
          <p className="font-medium">Essay questions require manual grading</p>
          <p className="text-blue-600 mt-1">
            Essay responses will appear in your grading queue after students submit.
            Consider using the rubric guidelines above for consistent scoring.
          </p>
        </div>
      </div>
    </div>
  );
}
