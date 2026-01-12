'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionBank } from '@/teacher-app/lib/types/assessment-builder';
import {
  getQuestionBanks,
  createQuestionBank,
  deleteQuestionBank,
} from '@/teacher-app/lib/dal/assessment-builder';

export default function QuestionBanksPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state for new bank
  const [newBankName, setNewBankName] = useState('');
  const [newBankDescription, setNewBankDescription] = useState('');
  const [newBankSubjectId, setNewBankSubjectId] = useState('');

  // Subjects for dropdown (would come from API in real app)
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  // Load banks
  const loadBanks = useCallback(async () => {
    setLoading(true);
    const result = await getQuestionBanks({ searchQuery: searchQuery || undefined });
    if (!result.error && result.data) {
      setBanks(result.data.banks || []);
    }
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    loadBanks();
  }, [loadBanks]);

  // Load subjects
  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await fetch('/api/teacher/subjects');
        if (res.ok) {
          const data = await res.json();
          setSubjects(data.subjects || []);
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    }
    loadSubjects();
  }, []);

  // Create bank
  const handleCreateBank = async () => {
    if (!newBankName.trim() || !newBankSubjectId) return;

    setCreating(true);
    const result = await createQuestionBank({
      name: newBankName.trim(),
      description: newBankDescription.trim() || undefined,
      subjectId: newBankSubjectId,
    });

    if (!result.error && result.data) {
      setBanks((prev) => [result.data!.bank, ...prev]);
      setShowCreateModal(false);
      setNewBankName('');
      setNewBankDescription('');
      setNewBankSubjectId('');
    }
    setCreating(false);
  };

  // Delete bank
  const handleDeleteBank = async (bankId: string) => {
    setDeleting(true);
    const result = await deleteQuestionBank(bankId);
    if (!result.error) {
      setBanks((prev) => prev.filter((b) => b.id !== bankId));
      setShowDeleteConfirm(null);
    }
    setDeleting(false);
  };

  // Navigate to bank detail
  const handleBankClick = (bankId: string) => {
    router.push(`/teacher/question-banks/${bankId}`);
  };

  // Filter banks by search
  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bank.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Question Banks</h1>
              <p className="text-sm text-slate-500 mt-1">
                Organize and reuse questions across assessments
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              New Bank
            </button>
          </div>

          {/* Search */}
          <div className="mt-6">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search question banks..."
                className="w-full md:w-96 rounded-lg border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-msu-maroon mx-auto"></div>
            <p className="text-sm text-slate-500 mt-4">Loading question banks...</p>
          </div>
        ) : filteredBanks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-400">folder</span>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {searchQuery ? 'No banks found' : 'No Question Banks Yet'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Create your first question bank to start organizing questions'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Create Question Bank
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBanks.map((bank) => (
              <div
                key={bank.id}
                onClick={() => handleBankClick(bank.id)}
                className="group relative bg-white rounded-xl border border-slate-200 p-6 hover:border-msu-maroon hover:shadow-md cursor-pointer transition-all"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(bank.id);
                  }}
                  className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>

                {/* Bank icon */}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-msu-maroon/10 mb-4">
                  <span className="material-symbols-outlined text-2xl text-msu-maroon">folder</span>
                </div>

                {/* Bank info */}
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{bank.name}</h3>
                {bank.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">{bank.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">quiz</span>
                    {bank.questionCount || 0} questions
                  </div>
                </div>

                {/* Tags */}
                {bank.tags && bank.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {bank.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                    {bank.tags.length > 3 && (
                      <span className="text-xs text-slate-400">+{bank.tags.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Create Question Bank</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
                    placeholder="e.g., Algebra Chapter 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newBankSubjectId}
                    onChange={(e) => setNewBankSubjectId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
                  >
                    <option value="">Select a subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newBankDescription}
                    onChange={(e) => setNewBankDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
                    placeholder="Optional description..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewBankName('');
                    setNewBankDescription('');
                    setNewBankSubjectId('');
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBank}
                  disabled={!newBankName.trim() || !newBankSubjectId || creating}
                  className="rounded-lg bg-msu-maroon px-4 py-2.5 text-sm font-medium text-white hover:bg-msu-maroon/90 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Bank'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-red-600">warning</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Question Bank?</h3>
            <p className="text-sm text-slate-500 mb-6">
              This will permanently delete the question bank and all its questions.
              This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBank(showDeleteConfirm)}
                disabled={deleting}
                className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
