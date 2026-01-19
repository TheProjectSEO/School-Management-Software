'use client';

import { useState } from 'react';
import { MatchingContent, MatchingPair, generateId } from '@/lib/types/assessment-builder';

interface MatchingEditorProps {
  value: MatchingContent;
  onChange: (content: MatchingContent) => void;
  disabled?: boolean;
}

export function MatchingEditor({
  value,
  onChange,
  disabled = false,
}: MatchingEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleLeftChange = (index: number, left: string) => {
    const newPairs = [...value.pairs];
    newPairs[index] = { ...newPairs[index], left };
    onChange({ ...value, pairs: newPairs });
  };

  const handleRightChange = (index: number, right: string) => {
    const newPairs = [...value.pairs];
    newPairs[index] = { ...newPairs[index], right };
    onChange({ ...value, pairs: newPairs });
  };

  const addPair = () => {
    const newPairs: MatchingPair[] = [
      ...value.pairs,
      { id: generateId(), left: '', right: '' },
    ];
    onChange({ ...value, pairs: newPairs });
  };

  const removePair = (index: number) => {
    if (value.pairs.length <= 2) return; // Minimum 2 pairs
    const newPairs = value.pairs.filter((_, i) => i !== index);
    onChange({ ...value, pairs: newPairs });
  };

  const toggleShuffleRight = () => {
    onChange({ ...value, shuffleRight: !value.shuffleRight });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPairs = [...value.pairs];
    const draggedPair = newPairs[draggedIndex];
    newPairs.splice(draggedIndex, 1);
    newPairs.splice(index, 0, draggedPair);
    onChange({ ...value, pairs: newPairs });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const validPairsCount = value.pairs.filter(
    (p) => p.left.trim() && p.right.trim()
  ).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400">swap_horiz</span>
          <span className="text-sm font-medium text-slate-700">Matching Pairs</span>
        </div>
        <span className="text-xs text-slate-500">
          {validPairsCount} valid pair{validPairsCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[40px_1fr_40px_1fr_40px] gap-3 px-3">
        <div></div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Left Column (Prompt)
        </div>
        <div></div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Right Column (Answer)
        </div>
        <div></div>
      </div>

      {/* Pairs List */}
      <div className="space-y-2">
        {value.pairs.map((pair, index) => (
          <div
            key={pair.id}
            draggable={!disabled}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`grid grid-cols-[40px_1fr_40px_1fr_40px] gap-3 items-center p-3 rounded-lg border transition-all ${
              draggedIndex === index
                ? 'border-msu-maroon bg-msu-maroon/5'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            {/* Drag Handle */}
            <button
              type="button"
              className="cursor-grab text-slate-400 hover:text-slate-600 flex justify-center"
              disabled={disabled}
            >
              <span className="material-symbols-outlined text-lg">drag_indicator</span>
            </button>

            {/* Left Input */}
            <input
              type="text"
              value={pair.left}
              onChange={(e) => handleLeftChange(index, e.target.value)}
              disabled={disabled}
              placeholder={`Item ${index + 1}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
            />

            {/* Connector */}
            <div className="flex justify-center">
              <span className="material-symbols-outlined text-teal-500 text-xl">
                arrow_forward
              </span>
            </div>

            {/* Right Input */}
            <input
              type="text"
              value={pair.right}
              onChange={(e) => handleRightChange(index, e.target.value)}
              disabled={disabled}
              placeholder={`Match ${index + 1}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
            />

            {/* Remove Button */}
            {value.pairs.length > 2 && (
              <button
                type="button"
                onClick={() => removePair(index)}
                disabled={disabled}
                className="flex justify-center text-slate-400 hover:text-red-500 transition-colors"
                title="Remove pair"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
            {value.pairs.length <= 2 && <div></div>}
          </div>
        ))}
      </div>

      {/* Add Pair Button */}
      <button
        type="button"
        onClick={addPair}
        disabled={disabled || value.pairs.length >= 15}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-msu-maroon hover:text-msu-maroon transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-lg">add</span>
        Add Matching Pair
      </button>

      {/* Options */}
      <div className="rounded-lg bg-slate-50 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value.shuffleRight}
            onChange={toggleShuffleRight}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
          />
          <div>
            <span className="text-sm font-medium text-slate-700">
              Shuffle right column
            </span>
            <p className="text-xs text-slate-500">
              {value.shuffleRight
                ? 'Right column items will appear in random order for each student'
                : 'Right column items will maintain their original order'}
            </p>
          </div>
        </label>
      </div>

      {/* Student View Preview */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Student View Preview</h4>
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Items
            </div>
            {value.pairs.slice(0, 4).map((pair, index) => (
              <div
                key={`left-${pair.id}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {index + 1}
                </span>
                <span className="text-sm text-slate-700">
                  {pair.left || `Item ${index + 1}`}
                </span>
              </div>
            ))}
            {value.pairs.length > 4 && (
              <div className="text-xs text-slate-400 text-center py-1">
                +{value.pairs.length - 4} more items
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Matches
            </div>
            {value.pairs.slice(0, 4).map((pair, index) => (
              <div
                key={`right-${pair.id}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-600">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-sm text-slate-700">
                  {pair.right || `Match ${index + 1}`}
                </span>
              </div>
            ))}
            {value.pairs.length > 4 && (
              <div className="text-xs text-slate-400 text-center py-1">
                +{value.pairs.length - 4} more matches
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 text-center">
          Students will drag items from left to their matching answers on right
        </p>
      </div>

      {/* Validation Warning */}
      {validPairsCount < 2 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <span className="material-symbols-outlined text-lg">warning</span>
          Please enter at least 2 complete matching pairs
        </div>
      )}
    </div>
  );
}
