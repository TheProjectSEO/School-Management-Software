'use client';

import { useState, useEffect } from 'react';
import { FillInBlankContent, generateId } from '@/lib/types/assessment-builder';

interface FillInBlankEditorProps {
  value: FillInBlankContent;
  onChange: (content: FillInBlankContent) => void;
  disabled?: boolean;
}

export function FillInBlankEditor({
  value,
  onChange,
  disabled = false,
}: FillInBlankEditorProps) {
  const [showHelp, setShowHelp] = useState(false);

  // Parse blanks from text whenever text changes
  useEffect(() => {
    const blankPattern = /\[blank(?::([a-zA-Z0-9_]+))?\]/g;
    const matches: { id: string; position: number }[] = [];
    let match;

    while ((match = blankPattern.exec(value.textWithBlanks)) !== null) {
      const id = match[1] || `blank_${matches.length + 1}`;
      matches.push({ id, position: match.index });
    }

    // Sync blanks array with found blanks
    const newBlanks = matches.map((m) => {
      const existing = value.blanks.find((b) => b.id === m.id);
      return existing || {
        id: m.id,
        acceptedAnswers: [''],
        caseSensitive: false,
      };
    });

    // Only update if blanks changed
    if (JSON.stringify(newBlanks.map(b => b.id)) !== JSON.stringify(value.blanks.map(b => b.id))) {
      onChange({ ...value, blanks: newBlanks });
    }
  }, [value.textWithBlanks]);

  const handleTextChange = (textWithBlanks: string) => {
    onChange({ ...value, textWithBlanks });
  };

  const handleAnswerChange = (blankIndex: number, answerIndex: number, answer: string) => {
    const newBlanks = [...value.blanks];
    const newAnswers = [...newBlanks[blankIndex].acceptedAnswers];
    newAnswers[answerIndex] = answer;
    newBlanks[blankIndex] = { ...newBlanks[blankIndex], acceptedAnswers: newAnswers };
    onChange({ ...value, blanks: newBlanks });
  };

  const addAnswer = (blankIndex: number) => {
    const newBlanks = [...value.blanks];
    newBlanks[blankIndex] = {
      ...newBlanks[blankIndex],
      acceptedAnswers: [...newBlanks[blankIndex].acceptedAnswers, ''],
    };
    onChange({ ...value, blanks: newBlanks });
  };

  const removeAnswer = (blankIndex: number, answerIndex: number) => {
    const newBlanks = [...value.blanks];
    if (newBlanks[blankIndex].acceptedAnswers.length <= 1) return;
    newBlanks[blankIndex] = {
      ...newBlanks[blankIndex],
      acceptedAnswers: newBlanks[blankIndex].acceptedAnswers.filter((_, i) => i !== answerIndex),
    };
    onChange({ ...value, blanks: newBlanks });
  };

  const toggleCaseSensitive = (blankIndex: number) => {
    const newBlanks = [...value.blanks];
    newBlanks[blankIndex] = {
      ...newBlanks[blankIndex],
      caseSensitive: !newBlanks[blankIndex].caseSensitive,
    };
    onChange({ ...value, blanks: newBlanks });
  };

  const insertBlank = () => {
    const blankId = `blank_${value.blanks.length + 1}`;
    const newText = value.textWithBlanks + ` [blank:${blankId}]`;
    handleTextChange(newText);
  };

  // Render preview with blanks highlighted
  const renderPreview = () => {
    const parts: { text: string; isBlank: boolean; blankId?: string }[] = [];
    let lastIndex = 0;
    const blankPattern = /\[blank(?::([a-zA-Z0-9_]+))?\]/g;
    let match;
    let blankCounter = 0;

    while ((match = blankPattern.exec(value.textWithBlanks)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: value.textWithBlanks.slice(lastIndex, match.index), isBlank: false });
      }
      const id = match[1] || `blank_${blankCounter + 1}`;
      parts.push({ text: '', isBlank: true, blankId: id });
      lastIndex = match.index + match[0].length;
      blankCounter++;
    }

    if (lastIndex < value.textWithBlanks.length) {
      parts.push({ text: value.textWithBlanks.slice(lastIndex), isBlank: false });
    }

    return parts;
  };

  const previewParts = renderPreview();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400">text_fields</span>
          <span className="text-sm font-medium text-slate-700">Fill in the Blank</span>
        </div>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-msu-maroon hover:underline flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">help</span>
          {showHelp ? 'Hide Help' : 'Show Help'}
        </button>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          <h4 className="font-medium mb-2">How to create blanks:</h4>
          <ul className="space-y-1 text-blue-600 ml-4 list-disc">
            <li>Use <code className="bg-blue-100 px-1 rounded">[blank]</code> for automatic blank IDs</li>
            <li>Use <code className="bg-blue-100 px-1 rounded">[blank:capital]</code> for named blanks</li>
            <li>Each blank can have multiple accepted answers</li>
          </ul>
          <p className="mt-2 text-blue-600">
            Example: &quot;The capital of France is [blank:capital].&quot;
          </p>
        </div>
      )}

      {/* Text Input */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Sentence with Blanks</label>
          <button
            type="button"
            onClick={insertBlank}
            disabled={disabled}
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Insert Blank
          </button>
        </div>
        <textarea
          value={value.textWithBlanks}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter your sentence with [blank] markers for answers..."
          rows={4}
          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon resize-none font-mono"
        />
      </div>

      {/* Blanks Configuration */}
      {value.blanks.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-700">
            Configure Answers ({value.blanks.length} blank{value.blanks.length !== 1 ? 's' : ''})
          </h4>

          {value.blanks.map((blank, blankIndex) => (
            <div
              key={blank.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-xs font-semibold">
                    {blankIndex + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    Blank: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{blank.id}</code>
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blank.caseSensitive}
                    onChange={() => toggleCaseSensitive(blankIndex)}
                    disabled={disabled}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
                  />
                  Case sensitive
                </label>
              </div>

              {/* Accepted Answers */}
              <div className="space-y-2">
                {blank.acceptedAnswers.map((answer, answerIndex) => (
                  <div key={answerIndex} className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <span className="material-symbols-outlined text-xs">check</span>
                    </div>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => handleAnswerChange(blankIndex, answerIndex, e.target.value)}
                      disabled={disabled}
                      placeholder={answerIndex === 0 ? 'Primary answer' : 'Alternative answer'}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
                    />
                    {blank.acceptedAnswers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAnswer(blankIndex, answerIndex)}
                        disabled={disabled}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addAnswer(blankIndex)}
                  disabled={disabled || blank.acceptedAnswers.length >= 5}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-msu-maroon transition-colors ml-8"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add alternative answer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Student View Preview</h4>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            {previewParts.map((part, index) =>
              part.isBlank ? (
                <span
                  key={index}
                  className="inline-block mx-1 min-w-[80px] border-b-2 border-orange-400 bg-orange-50 px-2 py-0.5 text-center text-orange-600"
                >
                  ________
                </span>
              ) : (
                <span key={index}>{part.text}</span>
              )
            )}
          </p>
          {previewParts.length === 0 && (
            <p className="text-sm text-slate-400 italic">
              Enter text with [blank] markers to see preview
            </p>
          )}
        </div>
      </div>

      {/* Validation Warning */}
      {value.blanks.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <span className="material-symbols-outlined text-lg">warning</span>
          Add at least one [blank] marker in the text
        </div>
      )}

      {value.blanks.some((b) => b.acceptedAnswers.every((a) => !a.trim())) && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <span className="material-symbols-outlined text-lg">warning</span>
          Please provide at least one accepted answer for each blank
        </div>
      )}
    </div>
  );
}
