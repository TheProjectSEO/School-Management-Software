"use client";

import { authFetch } from "@/lib/utils/authFetch";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Application = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  applying_for_grade?: string;
  preferred_track?: string;
  status: string;
  submitted_at?: string;
};

type Section = {
  id: string;
  name: string;
  grade_level: string;
  enrolled_count: number;
  capacity: number;
};

type ReviewDoc = {
  id: string;
  document_type: string;
  file_name: string;
  mime_type?: string;
  url: string;
  mimeType: string;
  verified: boolean;
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Approve modal
  const [showApproveModal, setShowApproveModal] = useState<{ applicationId: string; gradeLevel?: string } | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [loadingSections, setLoadingSections] = useState(false);
  const [approving, setApproving] = useState(false);

  // Review modal
  const [reviewApp, setReviewApp] = useState<Application | null>(null);
  const [reviewDocs, setReviewDocs] = useState<ReviewDoc[]>([]);
  const [loadingReview, setLoadingReview] = useState(false);
  const [activeDocIdx, setActiveDocIdx] = useState(0);

  useEffect(() => {
    load();
  }, [filter]);

  // Real-time: auto-reload whenever student_applications table changes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-applications-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "student_applications" }, () => {
        load();
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    params.set("_t", Date.now().toString());
    const res = await authFetch(`/api/admin/applications?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load applications");
      setApplications([]);
    } else {
      setApplications(json.applications || []);
    }
    setLoading(false);
  }

  // ── Review modal ──────────────────────────────────────────
  async function handleReviewClick(app: Application) {
    setReviewApp(app);
    setReviewDocs([]);
    setActiveDocIdx(0);
    setLoadingReview(true);
    try {
      const res = await authFetch(`/api/admin/applications/${app.id}`);
      const json = await res.json();
      const docs: { id: string; document_type: string; file_name: string; mime_type?: string; verified: boolean }[] =
        json.documents || [];

      const docsWithUrls = await Promise.all(
        docs.map(async (doc) => {
          try {
            const r = await authFetch(`/api/admin/applications/${app.id}/documents/${doc.id}`);
            const d = await r.json();
            return {
              ...doc,
              url: d.url || "",
              mimeType: d.mimeType || doc.mime_type || "",
            } as ReviewDoc;
          } catch {
            return { ...doc, url: "", mimeType: doc.mime_type || "" } as ReviewDoc;
          }
        })
      );
      setReviewDocs(docsWithUrls);
    } catch (err) {
      console.error("Failed to load review docs:", err);
    } finally {
      setLoadingReview(false);
    }
  }

  function closeReview() {
    setReviewApp(null);
    setReviewDocs([]);
  }

  // ── Approve flow ──────────────────────────────────────────
  async function handleApproveClick(app: Application) {
    setShowApproveModal({ applicationId: app.id, gradeLevel: app.applying_for_grade });
    setSelectedSectionId("");
    setSections([]);
    if (app.applying_for_grade) {
      setLoadingSections(true);
      try {
        const res = await authFetch(`/api/admin/sections?gradeLevel=${encodeURIComponent(app.applying_for_grade)}`);
        const data = await res.json();
        setSections(Array.isArray(data) ? data : []);
      } catch {
        setSections([]);
      } finally {
        setLoadingSections(false);
      }
    }
  }

  async function confirmApprove() {
    if (!showApproveModal) return;
    setApproving(true);
    try {
      const res = await authFetch(`/api/admin/applications/${showApproveModal.applicationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedSectionId ? { sectionId: selectedSectionId } : {}),
      });
      const json = await res.json();
      if (res.ok) {
        alert("Application approved! Student account created and enrolled.");
        setShowApproveModal(null);
        setSelectedSectionId("");
        await new Promise((r) => setTimeout(r, 500));
        await load();
      } else {
        alert(`Failed to approve: ${json.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setApproving(false);
    }
  }

  // ── Generic status actions ────────────────────────────────
  async function updateStatus(id: string, action: "reject" | "request-info") {
    try {
      const body = action === "request-info" ? { requestedDocuments: ["birth_certificate", "report_card"] } : {};
      const res = await authFetch(`/api/admin/applications/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        await new Promise((r) => setTimeout(r, 500));
        await load();
      } else {
        alert(`Failed: ${json.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      pending_info: "bg-yellow-100 text-yellow-800",
      info_requested: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
    };
    return `px-2 py-1 rounded text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-800"}`;
  };

  const isFinal = (status: string) => status === "approved" || status === "rejected";

  return (
    <main>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Applications</h1>
          <p className="text-gray-600 text-sm">Review and manage incoming applications.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="info_requested">Info requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="px-3 py-2 border rounded text-sm" onClick={() => { setFilter(""); load(); }}>
            Refresh
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-500 py-4">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Grade</th>
                <th className="px-3 py-2 text-left">Track</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Submitted</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">
                    {app.first_name} {app.last_name}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{app.email}</td>
                  <td className="px-3 py-2">{app.applying_for_grade || "-"}</td>
                  <td className="px-3 py-2">{app.preferred_track || "-"}</td>
                  <td className="px-3 py-2">
                    <span className={statusBadge(app.status)}>{app.status.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                    {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Review button — always available */}
                      <button
                        onClick={() => handleReviewClick(app)}
                        className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        Review
                      </button>
                      {!isFinal(app.status) && (
                        <>
                          <button
                            onClick={() => handleApproveClick(app)}
                            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(app.id, "reject")}
                            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-gray-500" colSpan={7}>
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Review Modal ─────────────────────────────────────── */}
      {reviewApp && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && closeReview()}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8 flex flex-col">
            {/* Modal header */}
            <div className="flex items-start justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">
                  {reviewApp.first_name} {reviewApp.last_name}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {reviewApp.email}
                  {reviewApp.phone ? ` · ${reviewApp.phone}` : ""}
                  {reviewApp.applying_for_grade ? ` · Grade ${reviewApp.applying_for_grade}` : ""}
                  {reviewApp.preferred_track ? ` · ${reviewApp.preferred_track}` : ""}
                </p>
                <span className={`mt-1 inline-block ${statusBadge(reviewApp.status)}`}>
                  {reviewApp.status.replace(/_/g, " ")}
                </span>
              </div>
              <button
                onClick={closeReview}
                className="text-gray-400 hover:text-gray-700 ml-4 mt-1"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Document body */}
            <div className="p-6 flex-1">
              {loadingReview && (
                <div className="flex items-center justify-center py-16 text-gray-500">
                  <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                  Loading documents...
                </div>
              )}

              {!loadingReview && reviewDocs.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                  <span className="material-symbols-outlined text-4xl mb-2 block text-gray-300">
                    folder_open
                  </span>
                  No documents uploaded yet.
                </div>
              )}

              {!loadingReview && reviewDocs.length > 0 && (
                <div className="space-y-2">
                  {/* Tab strip if multiple docs */}
                  {reviewDocs.length > 1 && (
                    <div className="flex gap-1 flex-wrap pb-3 border-b mb-4">
                      {reviewDocs.map((doc, idx) => (
                        <button
                          key={doc.id}
                          onClick={() => setActiveDocIdx(idx)}
                          className={`px-3 py-1.5 text-xs rounded-full font-medium capitalize transition-colors ${
                            idx === activeDocIdx
                              ? "bg-[#7B1113] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {doc.document_type.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Active document viewer */}
                  {reviewDocs[activeDocIdx] && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                        <span className="text-sm font-medium capitalize">
                          {reviewDocs[activeDocIdx].document_type.replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">{reviewDocs[activeDocIdx].file_name}</span>
                          {reviewDocs[activeDocIdx].url && (
                            <a
                              href={reviewDocs[activeDocIdx].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                              Open
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-center bg-gray-100 min-h-[400px]">
                        {!reviewDocs[activeDocIdx].url ? (
                          <p className="text-red-500 text-sm">Failed to load document</p>
                        ) : reviewDocs[activeDocIdx].mimeType?.startsWith("image/") ? (
                          <img
                            src={reviewDocs[activeDocIdx].url}
                            alt={reviewDocs[activeDocIdx].document_type}
                            className="max-w-full max-h-[520px] object-contain rounded"
                          />
                        ) : (
                          <iframe
                            src={reviewDocs[activeDocIdx].url}
                            className="w-full h-[520px]"
                            title={reviewDocs[activeDocIdx].file_name}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Navigation arrows if multiple docs */}
                  {reviewDocs.length > 1 && (
                    <div className="flex justify-between pt-2">
                      <button
                        onClick={() => setActiveDocIdx((i) => Math.max(0, i - 1))}
                        disabled={activeDocIdx === 0}
                        className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-40"
                      >
                        ← Previous
                      </button>
                      <span className="text-sm text-gray-500 self-center">
                        {activeDocIdx + 1} / {reviewDocs.length}
                      </span>
                      <button
                        onClick={() => setActiveDocIdx((i) => Math.min(reviewDocs.length - 1, i + 1))}
                        disabled={activeDocIdx === reviewDocs.length - 1}
                        className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-40"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t flex items-center justify-between bg-gray-50 rounded-b-xl">
              <button
                onClick={closeReview}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
              {!isFinal(reviewApp.status) && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { closeReview(); updateStatus(reviewApp.id, "reject"); }}
                    className="px-4 py-2 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => { closeReview(); handleApproveClick(reviewApp); }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Modal ─────────────────────────────────────── */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Approve Application</h2>
            <p className="text-gray-600 mb-4">
              Select a section to assign the student to. This will automatically enroll them in all courses for that section.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section{showApproveModal.gradeLevel ? ` (Grade ${showApproveModal.gradeLevel})` : ""}
              </label>
              {loadingSections ? (
                <p className="text-sm text-gray-500">Loading sections...</p>
              ) : sections.length === 0 ? (
                <p className="text-sm text-yellow-600">
                  No sections found for this grade. You can approve without a section and enroll manually later.
                </p>
              ) : (
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select a section (optional)</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - Grade {s.grade_level} ({s.enrolled_count}/{s.capacity})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowApproveModal(null); setSelectedSectionId(""); setSections([]); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={approving}
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                disabled={approving}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {approving ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
