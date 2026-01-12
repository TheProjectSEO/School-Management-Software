'use client';

import { useState } from 'react';
import { QuestionBank } from '@/teacher-app/lib/types/assessment-builder';

interface QuestionBankListProps {
  banks: QuestionBank[];
  onSelectBank: (bank: QuestionBank) => void;
  onCreateBank: (name: string, description?: string) => Promise<void>;
  onDeleteBank?: (bankId: string) => Promise<void>;
  isLoading?: boolean;
}

export function QuestionBankList({
  banks,
  onSelectBank,
  onCreateBank,
  onDeleteBank,
  isLoading = false,
}: QuestionBankListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankDescription, setNewBankDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newBankName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateBank(newBankName.trim(), newBankDescription.trim() || undefined);
      setShowCreateModal(false);
      setNewBankName('');
      setNewBankDescription('');
    } catch (error) {
      console.error('Failed to create bank:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (bankId: string) => {
    if (!onDeleteBank) return;

    try {
      await onDeleteBank(bankId);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete bank:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Question Banks</h2>
          <p className="text-sm text-slate-500 mt-1">
            Organize your questions into reusable banks
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Create Bank
        </button>
      </div>

      {/* Banks Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-3xl text-msu-maroon">
            progress_activity
          </span>
        </div>
      ) : banks.length === 0 ? (
        <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-slate-400">folder</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Question Banks Yet</h3>
          <p className="text-sm text-slate-500 mb-4">
            Create your first question bank to start organizing questions
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create First Bank
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((bank) => (
            <div
              key={bank.id}
              className="group relative rounded-xl border border-slate-200 bg-white p-5 hover:border-msu-maroon/50 hover:shadow-md transition-all"
            >
              {/* Delete Confirmation Overlay */}
              {deleteConfirmId === bank.id && onDeleteBank && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/95 backdrop-blur-sm p-4">
                  <span className="material-symbols-outlined text-3xl text-red-500 mb-2">
                    warning
                  </span>
                  <p className="text-sm font-medium text-slate-900 text-center mb-1">
                    Delete this bank?
                  </p>
                  <p className="text-xs text-slate-500 text-center mb-4">
                    All questions will be removed
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(bank.id)}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-msu-maroon/10">
                  <span className="material-symbols-outlined text-msu-maroon">folder</span>
                </div>
                {onDeleteBank && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(bank.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                )}
              </div>

              <h3 className="font-semibold text-slate-900 mb-1">{bank.name}</h3>
              {bank.description && (
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">{bank.description}</p>
              )}

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    <span className="material-symbols-outlined text-sm">help</span>
                    {bank.questionCount}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectBank(bank)}
                  className="flex items-center gap-1 text-sm font-medium text-msu-maroon hover:underline"
                >
                  View
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Bank Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Create Question Bank</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="e.g., Chapter 1 Quiz Questions"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={newBankDescription}
                    onChange={(e) => setNewBankDescription(e.target.value)}
                    placeholder="Describe the purpose of this question bank..."
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:outline-none focus:ring-1 focus:ring-msu-maroon resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating || !newBankName.trim()}
                  className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2 text-sm font-medium text-white hover:bg-msu-maroon/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">
                        progress_activity
                      </span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">add</span>
                      Create Bank
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
