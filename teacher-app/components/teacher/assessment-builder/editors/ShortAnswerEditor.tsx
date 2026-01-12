'use client';

import { ShortAnswerContent } from '@/teacher-app/lib/types/assessment-builder';

interface ShortAnswerEditorProps {
  value: ShortAnswerContent;
  onChange: (content: ShortAnswerContent) => void;
  disabled?: boolean;
}

export function ShortAnswerEditor({
  value,
  onChange,
  disabled = false,
}: ShortAnswerEditorProps) {
  const handleAnswerChange = (index: number, answer: string) => {
    const newAnswers = [...value.expectedAnswers];
    newAnswers[index] = answer;
    onChange({ ...value, expectedAnswers: newAnswers });
  };

  const addAnswer = () => {
    onChange({
      ...value,
      expectedAnswers: [...value.expectedAnswers, ''],
    });
  };

  const removeAnswer = (index: number) => {
    if (value.expectedAnswers.length <= 1) return;
    const newAnswers = value.expectedAnswers.filter((_, i) => i !== index);
    onChange({ ...value, expectedAnswers: newAnswers });
  };

  const toggleCaseSensitive = () => {
    onChange({ ...value, caseSensitive: !value.caseSensitive });
  };

  const togglePartialMatch = () => {
    onChange({ ...value, partialMatchAllowed: !value.partialMatchAllowed });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400">short_text</span>
        <span className="text-sm font-medium text-slate-700">Accepted Answers</span>
      </div>

      {/* Expected Answers */}
      <div className="space-y-3">
        {value.expectedAnswers.map((answer, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
              <span className="material-symbols-outlined text-sm">check</span>
            </div>
            <input
              type="text"
              value={answer}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              disabled={disabled}
              placeholder={index === 0 ? 'Primary expected answer' : 'Alternative answer'}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
            />
            {value.expectedAnswers.length > 1 && (
              <button
                type="button"
                onClick={() => removeAnswer(index)}
                disabled={disabled}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Remove answer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        ))}

        {/* Add Answer Button */}
        <button
          type="button"
          onClick={addAnswer}
          disabled={disabled || value.expectedAnswers.length >= 10}
          className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-msu-maroon hover:text-msu-maroon transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Alternative Answer
        </button>
      </div>

      {/* Options */}
      <div className="space-y-3 rounded-lg bg-slate-50 p-4">
        <h4 className="text-sm font-medium text-slate-700">Grading Options</h4>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value.caseSensitive}
            onChange={toggleCaseSensitive}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
          />
          <div>
            <span className="text-sm font-medium text-slate-700">Case sensitive</span>
            <p className="text-xs text-slate-500">
              {value.caseSensitive
                ? 'Answer must match exact capitalization (e.g., "Paris" ≠ "paris")'
                : 'Any capitalization is accepted (e.g., "Paris" = "paris" = "PARIS")'}
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value.partialMatchAllowed}
            onChange={togglePartialMatch}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
          />
          <div>
            <span className="text-sm font-medium text-slate-700">Allow partial matches</span>
            <p className="text-xs text-slate-500">
              {value.partialMatchAllowed
                ? 'Answers containing the expected text are accepted'
                : 'Only exact matches are accepted'}
            </p>
          </div>
        </label>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Student View Preview</h4>
        <div className="space-y-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="text"
              placeholder="Student's answer will appear here..."
              disabled
              className="w-full bg-transparent text-sm text-slate-500 border-0 p-0 focus:outline-none"
            />
          </div>
          <p className="text-xs text-slate-400">
            Students will see a text input field to type their answer
          </p>
        </div>
      </div>

      {/* Validation Warning */}
      {value.expectedAnswers.every((a) => !a.trim()) && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <span className="material-symbols-outlined text-lg">warning</span>
          Please enter at least one expected answer
        </div>
      )}
    </div>
  );
}
