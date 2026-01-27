'use client';

import { useState } from 'react';
import {
  BankRule,
  BankRuleInput,
  QuestionBank,
  SeedMode,
  DifficultyLevel,
} from '@/lib/types/assessment-builder';

interface BankRulesPanelProps {
  rules: BankRule[];
  banks: QuestionBank[];
  onAddRule: (rule: BankRuleInput) => void;
  onUpdateRule: (ruleId: string, updates: Partial<BankRuleInput>) => void;
  onDeleteRule: (ruleId: string) => void;
  isLoading?: boolean;
}

export function BankRulesPanel({
  rules,
  banks,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  isLoading = false,
}: BankRulesPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState<BankRuleInput>({
    bankId: '',
    pickCount: 5,
    tagFilters: [],
    difficultyFilter: undefined,
    shuffleQuestions: true,
    shuffleChoices: true,
    seedMode: 'per_student',
  });
  const [tagInput, setTagInput] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const handleAddRule = () => {
    if (!newRule.bankId || newRule.pickCount <= 0) return;
    onAddRule(newRule);
    setNewRule({
      bankId: '',
      pickCount: 5,
      tagFilters: [],
      difficultyFilter: undefined,
      shuffleQuestions: true,
      shuffleChoices: true,
      seedMode: 'per_student',
    });
    setShowAddForm(false);
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    setNewRule({
      ...newRule,
      tagFilters: [...(newRule.tagFilters || []), tagInput.trim().toLowerCase()],
    });
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setNewRule({
      ...newRule,
      tagFilters: (newRule.tagFilters || []).filter((t) => t !== tag),
    });
  };

  const getAvailableCount = (bankId: string): number => {
    const bank = banks.find((b) => b.id === bankId);
    return bank?.questionCount || 0;
  };

  const totalRandomQuestions = rules.reduce((sum, r) => sum + r.pickCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Bank Rules</h3>
          <p className="text-sm text-slate-500 mt-1">
            Configure rules for randomly selecting questions from your question banks
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          disabled={banks.length === 0}
          className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Rule
        </button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4">
        <span className="material-symbols-outlined text-blue-500 mt-0.5">info</span>
        <div className="text-sm text-blue-700">
          <p className="font-medium">How Bank Rules Work</p>
          <p className="text-blue-600 mt-1">
            Bank rules automatically select random questions from your question banks when a student
            starts the assessment. Each rule can specify how many questions to pick, which tags to
            filter by, and whether to shuffle questions and choices.
          </p>
        </div>
      </div>

      {/* Stats */}
      {rules.length > 0 && (
        <div className="flex items-center gap-6 bg-slate-50 rounded-xl p-4">
          <div>
            <div className="text-2xl font-bold text-slate-900">{rules.length}</div>
            <div className="text-sm text-slate-500">Active Rules</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <div className="text-2xl font-bold text-msu-maroon">{totalRandomQuestions}</div>
            <div className="text-sm text-slate-500">Random Questions</div>
          </div>
        </div>
      )}

      {/* Rules List */}
      {rules.length === 0 && !showAddForm ? (
        <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-slate-400">shuffle</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Bank Rules</h3>
          <p className="text-sm text-slate-500 mb-4">
            Add rules to randomly select questions from your banks
          </p>
          {banks.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add First Rule
            </button>
          ) : (
            <p className="text-sm text-amber-600">
              Create a question bank first to use bank rules
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const bank = banks.find((b) => b.id === rule.bankId);

            return (
              <div
                key={rule.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-msu-maroon/10">
                      <span className="material-symbols-outlined text-msu-maroon">folder</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">{bank?.name || 'Unknown Bank'}</h4>
                      <p className="text-sm text-slate-500">
                        Pick {rule.pickCount} of {bank?.questionCount || 0} questions
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteRule(rule.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Questions to Pick
                    </label>
                    <input
                      type="number"
                      value={rule.pickCount}
                      onChange={(e) =>
                        onUpdateRule(rule.id, { pickCount: parseInt(e.target.value) || 1 })
                      }
                      min="1"
                      max={bank?.questionCount || 100}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Seed Mode
                    </label>
                    <select
                      value={rule.seedMode}
                      onChange={(e) =>
                        onUpdateRule(rule.id, { seedMode: e.target.value as SeedMode })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
                    >
                      <option value="per_student">Per Student</option>
                      <option value="per_attempt">Per Attempt</option>
                      <option value="fixed">Fixed (Same for all)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rule.shuffleQuestions}
                      onChange={(e) =>
                        onUpdateRule(rule.id, { shuffleQuestions: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
                    />
                    <label className="text-sm text-slate-700">Shuffle Questions</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rule.shuffleChoices}
                      onChange={(e) =>
                        onUpdateRule(rule.id, { shuffleChoices: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
                    />
                    <label className="text-sm text-slate-700">Shuffle Choices</label>
                  </div>
                </div>

                {/* Tag Filters */}
                {rule.tagFilters.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="block text-xs font-medium text-slate-500 mb-2">
                      Tag Filters
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {rule.tagFilters.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Rule Form */}
      {showAddForm && (
        <div className="rounded-xl border-2 border-msu-maroon/20 bg-msu-maroon/5 p-5">
          <h4 className="font-medium text-slate-900 mb-4">Add New Rule</h4>

          <div className="space-y-4">
            {/* Bank Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Question Bank <span className="text-red-500">*</span>
              </label>
              <select
                value={newRule.bankId}
                onChange={(e) => setNewRule({ ...newRule, bankId: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
              >
                <option value="">Select a bank...</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name} ({bank.questionCount} questions)
                  </option>
                ))}
              </select>
            </div>

            {/* Pick Count */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Questions to Pick <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={newRule.pickCount}
                  onChange={(e) =>
                    setNewRule({ ...newRule, pickCount: parseInt(e.target.value) || 1 })
                  }
                  min="1"
                  max={getAvailableCount(newRule.bankId)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
                />
                {newRule.bankId && (
                  <p className="text-xs text-slate-500 mt-1">
                    Max available: {getAvailableCount(newRule.bankId)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Seed Mode</label>
                <select
                  value={newRule.seedMode}
                  onChange={(e) =>
                    setNewRule({ ...newRule, seedMode: e.target.value as SeedMode })
                  }
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
                >
                  <option value="per_student">Per Student (same questions per student)</option>
                  <option value="per_attempt">Per Attempt (different each try)</option>
                  <option value="fixed">Fixed (same for everyone)</option>
                </select>
              </div>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Difficulty Filter <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => {
                  const isSelected = newRule.difficultyFilter?.includes(level);
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        const current = newRule.difficultyFilter || [];
                        setNewRule({
                          ...newRule,
                          difficultyFilter: isSelected
                            ? current.filter((d) => d !== level)
                            : [...current, level],
                        });
                      }}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                        isSelected
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
                  );
                })}
              </div>
            </div>

            {/* Tag Filters */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tag Filters <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              {newRule.tagFilters && newRule.tagFilters.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {newRule.tagFilters.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Enter a tag..."
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Shuffle Options */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRule.shuffleQuestions}
                  onChange={(e) =>
                    setNewRule({ ...newRule, shuffleQuestions: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
                />
                <span className="text-sm text-slate-700">Shuffle Questions</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRule.shuffleChoices}
                  onChange={(e) =>
                    setNewRule({ ...newRule, shuffleChoices: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
                />
                <span className="text-sm text-slate-700">Shuffle Choices</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddRule}
              disabled={!newRule.bankId || newRule.pickCount <= 0}
              className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2 text-sm font-medium text-white hover:bg-msu-maroon/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add Rule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
