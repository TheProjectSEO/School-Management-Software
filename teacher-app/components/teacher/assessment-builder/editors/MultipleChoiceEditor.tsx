'use client';

import { useState } from 'react';
import {
  MultipleChoiceContent,
  MultipleChoiceOption,
  generateId,
} from '@/teacher-app/lib/types/assessment-builder';

interface MultipleChoiceEditorProps {
  value: MultipleChoiceContent;
  onChange: (content: MultipleChoiceContent) => void;
  disabled?: boolean;
}

export function MultipleChoiceEditor({
  value,
  onChange,
  disabled = false,
}: MultipleChoiceEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const isMultiSelect = value.type === 'multiple_choice_multi';

  const handleOptionTextChange = (index: number, text: string) => {
    const newOptions = [...value.options];
    newOptions[index] = { ...newOptions[index], text };
    onChange({ ...value, options: newOptions });
  };

  const handleOptionCorrectChange = (index: number, isCorrect: boolean) => {
    const newOptions = [...value.options];

    if (isMultiSelect) {
      // Multi-select: toggle individual option
      newOptions[index] = { ...newOptions[index], isCorrect };
    } else {
      // Single select: only one can be correct
      newOptions.forEach((opt, i) => {
        newOptions[i] = { ...opt, isCorrect: i === index ? isCorrect : false };
      });
    }

    onChange({ ...value, options: newOptions });
  };

  const addOption = () => {
    const newOptions: MultipleChoiceOption[] = [
      ...value.options,
      { id: generateId(), text: '', isCorrect: false },
    ];
    onChange({ ...value, options: newOptions });
  };

  const removeOption = (index: number) => {
    if (value.options.length <= 2) return; // Minimum 2 options
    const newOptions = value.options.filter((_, i) => i !== index);
    onChange({ ...value, options: newOptions });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOptions = [...value.options];
    const draggedOption = newOptions[draggedIndex];
    newOptions.splice(draggedIndex, 1);
    newOptions.splice(index, 0, draggedOption);
    onChange({ ...value, options: newOptions });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const togglePartialCredit = () => {
    onChange({ ...value, allowPartialCredit: !value.allowPartialCredit });
  };

  const correctCount = value.options.filter((o) => o.isCorrect).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400">
            {isMultiSelect ? 'check_box' : 'radio_button_checked'}
          </span>
          <span className="text-sm font-medium text-slate-700">
            {isMultiSelect ? 'Multiple Select' : 'Single Select'}
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {correctCount} correct answer{correctCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {value.options.map((option, index) => (
          <div
            key={option.id}
            draggable={!disabled}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              draggedIndex === index
                ? 'border-msu-maroon bg-msu-maroon/5'
                : option.isCorrect
                ? 'border-green-300 bg-green-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            {/* Drag Handle */}
            <button
              type="button"
              className="cursor-grab text-slate-400 hover:text-slate-600"
              disabled={disabled}
            >
              <span className="material-symbols-outlined text-lg">drag_indicator</span>
            </button>

            {/* Option Letter */}
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              {String.fromCharCode(65 + index)}
            </span>

            {/* Correct Answer Toggle */}
            <button
              type="button"
              onClick={() => handleOptionCorrectChange(index, !option.isCorrect)}
              disabled={disabled}
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                option.isCorrect
                  ? 'bg-green-500 text-white'
                  : 'border border-slate-300 bg-white text-slate-400 hover:border-green-400 hover:text-green-500'
              }`}
              title={option.isCorrect ? 'Mark as incorrect' : 'Mark as correct'}
            >
              <span className="material-symbols-outlined text-sm">
                {isMultiSelect ? 'check' : 'check'}
              </span>
            </button>

            {/* Option Text Input */}
            <input
              type="text"
              value={option.text}
              onChange={(e) => handleOptionTextChange(index, e.target.value)}
              disabled={disabled}
              placeholder={`Option ${String.fromCharCode(65 + index)}`}
              className="flex-1 border-0 bg-transparent p-0 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0"
            />

            {/* Remove Option */}
            {value.options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                disabled={disabled}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Remove option"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Option Button */}
      <button
        type="button"
        onClick={addOption}
        disabled={disabled || value.options.length >= 10}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-msu-maroon hover:text-msu-maroon transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-lg">add</span>
        Add Option
      </button>

      {/* Multi-select specific options */}
      {isMultiSelect && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.allowPartialCredit || false}
              onChange={togglePartialCredit}
              disabled={disabled}
              className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
            />
            <span className="text-sm text-slate-700">Allow partial credit</span>
          </label>
          <span className="text-xs text-slate-500">
            (Student gets points for each correct selection)
          </span>
        </div>
      )}

      {/* Validation Warning */}
      {correctCount === 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <span className="material-symbols-outlined text-lg">warning</span>
          Please mark at least one option as correct
        </div>
      )}
    </div>
  );
}
