"use client";

import { authFetch } from "@/lib/utils/authFetch";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Application = any;
type Document = {
  id: string;
  document_type: string;
  file_name: string;
  storage_path: string;
  mime_type?: string;
  verified: boolean;
  rejection_reason?: string;
};

type ViewerDoc = { url: string; name: string; mimeType: string };

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const applicationId = params.id;

  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Inline viewer
  const [viewer, setViewer] = useState<ViewerDoc | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  useEffect(() => {
    load();
  }, [applicationId]);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await authFetch(`/api/admin/applications/${applicationId}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load application");
    } else {
      setApplication(json.application);
      setDocuments(json.documents || []);
    }
    setLoading(false);
  }

  async function viewDocument(doc: Document) {
    setViewerLoading(true);
    setViewer(null);
    const res = await authFetch(`/api/admin/applications/${applicationId}/documents/${doc.id}`);
    const json = await res.json();
    setViewerLoading(false);
    if (!res.ok) {
      alert(json.error || "Failed to get document");
      return;
    }
    setViewer({ url: json.url, name: json.fileName, mimeType: json.mimeType || doc.mime_type || "" });
  }

  const field = (label: string, value: string | null | undefined) =>
    value ? (
      <div>
        <dt className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</dt>
        <dd className="text-sm text-gray-800 mt-0.5">{value}</dd>
      </div>
    ) : null;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      info_requested: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
    };
    return `px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-800"}`;
  };

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back
        </button>
        <h1 className="text-xl font-semibold">Application Detail</h1>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {loading && <p className="text-gray-500">Loading...</p>}

      {application && (
        <>
          {/* Applicant Info Card */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {application.first_name} {application.middle_name ? `${application.middle_name} ` : ""}
                  {application.last_name}
                </h2>
                <p className="text-gray-500 text-sm">{application.email}</p>
              </div>
              <span className={statusBadge(application.status)}>
                {application.status?.replace(/_/g, " ")}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {field("Phone", application.phone)}
              {field("Gender", application.gender)}
              {field("Birth Date", application.birth_date ? new Date(application.birth_date).toLocaleDateString() : null)}
              {field("Address", application.address)}
              {field("Applying for Grade", application.applying_for_grade)}
              {field("Preferred Track", application.preferred_track)}
              {field("GPA", application.gpa?.toString())}
              {field("Previous School", application.previous_school)}
              {field("Last Grade Completed", application.last_grade_completed)}
              {field("How did you hear", application.how_did_you_hear)}
              {field("Submitted", application.submitted_at ? new Date(application.submitted_at).toLocaleString() : null)}
              {field("Reviewed", application.reviewed_at ? new Date(application.reviewed_at).toLocaleString() : null)}
            </div>

            {(application.guardian_name || application.guardian_phone) && (
              <div className="mt-5 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Guardian / Parent</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {field("Name", application.guardian_name)}
                  {field("Relation", application.guardian_relation)}
                  {field("Phone", application.guardian_phone)}
                  {field("Email", application.guardian_email)}
                </div>
              </div>
            )}

            {application.admin_notes && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                <strong>Admin Notes:</strong> {application.admin_notes}
              </div>
            )}
            {application.rejection_reason && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                <strong>Rejection Reason:</strong> {application.rejection_reason}
              </div>
            )}
          </div>

          {/* Documents Section */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-semibold mb-4">
              Uploaded Documents
              <span className="ml-2 text-xs font-normal text-gray-500">({documents.length})</span>
            </h2>

            {documents.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">folder_open</span>
                No documents uploaded.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Doc list */}
                <div className="divide-y border rounded-lg overflow-hidden">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium capitalize">{doc.document_type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-500">{doc.file_name}</p>
                      </div>
                      <button
                        onClick={() => viewDocument(doc)}
                        disabled={viewerLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        View
                      </button>
                    </div>
                  ))}
                </div>

                {/* Inline viewer */}
                {viewerLoading && (
                  <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border">
                    <span className="material-symbols-outlined animate-spin text-gray-400 mr-2">progress_activity</span>
                    <span className="text-gray-500 text-sm">Loading document...</span>
                  </div>
                )}

                {viewer && !viewerLoading && (
                  <div className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
                      <span className="text-sm font-medium">{viewer.name}</span>
                      <div className="flex items-center gap-3">
                        <a
                          href={viewer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Open in new tab
                        </a>
                        <button
                          onClick={() => setViewer(null)}
                          className="text-gray-400 hover:text-gray-700"
                          aria-label="Close viewer"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-center bg-gray-100 min-h-[420px]">
                      {viewer.mimeType?.startsWith("image/") ? (
                        <img
                          src={viewer.url}
                          alt={viewer.name}
                          className="max-w-full max-h-[600px] object-contain"
                        />
                      ) : (
                        <iframe
                          src={viewer.url}
                          className="w-full h-[600px]"
                          title={viewer.name}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
