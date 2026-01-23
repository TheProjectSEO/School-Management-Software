"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Application = any;
type Document = { id: string; document_type: string; file_name: string; storage_path: string; mime_type?: string };

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const applicationId = params.id;
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [applicationId]);

  async function load() {
    setError(null);
    const res = await fetch(`/api/admin/applications/${applicationId}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load application");
      return;
    }
    setApplication(json.application);
    setDocuments(json.documents || []);
  }

  async function viewDocument(docId: string) {
    const res = await fetch(`/api/admin/applications/${applicationId}/documents/${docId}`);
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Failed to get document");
      return;
    }
    const url = json.url as string;
    setViewer({ url, name: json.fileName });
  }

  const [viewer, setViewer] = useState<{ url: string; name: string } | null>(null);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Application Detail</h1>
      {error && <p className="text-red-600">{error}</p>}
      {!application && !error && <p>Loading...</p>}
      {application && (
        <div className="space-y-2">
          <p className="font-medium">
            {application.first_name} {application.last_name} — {application.email}
          </p>
          <p>Status: {application.status}</p>
          <p>Grade: {application.applying_for_grade || "-"} | Track: {application.preferred_track || "-"}</p>
          <p>Phone: {application.phone || "-"}</p>
          <p>Submitted: {application.submitted_at ? new Date(application.submitted_at).toLocaleString() : "-"}</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">Documents</h2>
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="px-3 py-2 capitalize">{doc.document_type}</td>
                  <td className="px-3 py-2">{doc.file_name}</td>
                  <td className="px-3 py-2">
                    <button className="text-blue-700 underline" onClick={() => viewDocument(doc.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={3}>
                    No documents uploaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewer && (
        <div className="border rounded p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{viewer.name}</p>
            <button className="text-sm text-red-700 underline" onClick={() => setViewer(null)}>
              Close
            </button>
          </div>
          <div className="w-full h-[600px]">
            <iframe src={viewer.url} className="w-full h-full border" title={viewer.name} />
          </div>
        </div>
      )}
    </main>
  );
}
