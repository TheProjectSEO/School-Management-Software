'use client';

import { TrueFalseContent } from '@/teacher-app/lib/types/assessment-builder';

interface TrueFalseEditorProps {
  value: TrueFalseContent;
  onChange: (content: TrueFalseContent) => void;
  disabled?: boolean;
}

export function TrueFalseEditor({
  value,
  onChange,
  disabled = false,
}: TrueFalseEditorProps) {
  const handleSelect = (correctAnswer: boolean) => {
    onChange({ ...value, correctAnswer });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400">toggle_on</span>
        <span className="text-sm font-medium text-slate-700">Select the correct answer</span>
      </div>

      {/* True/False Options */}
      <div className="grid grid-cols-2 gap-4">
        {/* True Option */}
        <button
          type="button"
          onClick={() => handleSelect(true)}
          disabled={disabled}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-6 transition-all ${
            value.correctAnswer === true
              ? 'border-green-500 bg-green-50 shadow-sm'
              : 'border-slate-200 bg-white hover:border-green-300 hover:bg-green-50/50'
          }`}
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              value.correctAnswer === true
                ? 'bg-green-500 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <span
            className={`text-lg font-semibold ${
              value.correctAnswer === true ? 'text-green-700' : 'text-slate-700'
            }`}
          >
            True
          </span>
          {value.correctAnswer === true && (
            <span className="text-xs font-medium text-green-600">Correct Answer</span>
          )}
        </button>

        {/* False Option */}
        <button
          type="button"
          onClick={() => handleSelect(false)}
          disabled={disabled}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-6 transition-all ${
            value.correctAnswer === false
              ? 'border-red-500 bg-red-50 shadow-sm'
              : 'border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/50'
          }`}
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              value.correctAnswer === false
                ? 'bg-red-500 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">cancel</span>
          </div>
          <span
            className={`text-lg font-semibold ${
              value.correctAnswer === false ? 'text-red-700' : 'text-slate-700'
            }`}
          >
            False
          </span>
          {value.correctAnswer === false && (
            <span className="text-xs font-medium text-red-600">Correct Answer</span>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3">
        <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">info</span>
        <div className="text-sm text-slate-600">
          <p>
            Click on the option that represents the correct answer to the question.
          </p>
          <p className="mt-1 text-slate-500">
            The selected option will be marked as correct when students take the assessment.
          </p>
        </div>
      </div>
    </div>
  );
}
