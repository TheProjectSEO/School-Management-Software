"use client";

import { useEffect, useState } from "react";

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

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    setError(null);
    const qs = filter ? `?status=${encodeURIComponent(filter)}` : "";
    const res = await fetch(`/api/admin/applications${qs}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load applications");
      setApplications([]);
    } else {
      setApplications(json.applications || []);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, action: "approve" | "reject" | "request-info") {
    const body =
      action === "request-info"
        ? { requestedDocuments: ["birth_certificate", "report_card"] }
        : {};
    const res = await fetch(`/api/admin/applications/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await load();
    } else {
      const json = await res.json();
      alert(json.error || "Failed to update application");
    }
  }

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Applications</h1>
          <p className="text-gray-600">Review and manage incoming applications.</p>
        </div>
        <div className="flex gap-2">
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="pending_info">Pending info</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            className="px-3 py-2 border rounded text-sm"
            onClick={() => {
              setFilter("");
              load();
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
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
                <tr key={app.id} className="border-t">
                  <td className="px-3 py-2">
                    <a className="text-blue-700 underline" href={`/applications/${app.id}`}>
                      {app.first_name} {app.last_name}
                    </a>
                  </td>
                  <td className="px-3 py-2">{app.email}</td>
                  <td className="px-3 py-2">{app.applying_for_grade || "-"}</td>
                  <td className="px-3 py-2">{app.preferred_track || "-"}</td>
                  <td className="px-3 py-2 capitalize">{app.status}</td>
                  <td className="px-3 py-2">{app.submitted_at ? new Date(app.submitted_at).toLocaleString() : "-"}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      className="text-green-700 underline"
                      onClick={() => updateStatus(app.id, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      className="text-orange-700 underline"
                      onClick={() => updateStatus(app.id, "request-info")}
                    >
                      Request Info
                    </button>
                    <button
                      className="text-red-700 underline"
                      onClick={() => updateStatus(app.id, "reject")}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={7}>
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
