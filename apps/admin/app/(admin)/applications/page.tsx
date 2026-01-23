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

type Section = {
  id: string;
  name: string;
  grade_level: string;
  enrolled_count: number;
  capacity: number;
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [showApproveModal, setShowApproveModal] = useState<{ applicationId: string; gradeLevel?: string } | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [loadingSections, setLoadingSections] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filter) {
      params.set("status", filter);
    }
    // Add cache-busting timestamp to ensure fresh data
    params.set("_t", Date.now().toString());
    const res = await fetch(`/api/admin/applications?${params.toString()}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load applications");
      setApplications([]);
    } else {
      setApplications(json.applications || []);
    }
    setLoading(false);
  }

  async function handleApproveClick(app: Application) {
    setShowApproveModal({ applicationId: app.id, gradeLevel: app.applying_for_grade });
    setSelectedSectionId("");
    setSections([]);
    
    // Load sections for the grade level
    if (app.applying_for_grade) {
      setLoadingSections(true);
      try {
        const res = await fetch(`/api/admin/sections?gradeLevel=${encodeURIComponent(app.applying_for_grade)}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSections(data);
        } else {
          setSections([]);
        }
      } catch (error) {
        console.error("Failed to load sections:", error);
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
      const body: { sectionId?: string } = {};
      if (selectedSectionId) {
        body.sectionId = selectedSectionId;
      }
      
      const res = await fetch(`/api/admin/applications/${showApproveModal.applicationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      const json = await res.json();
      
      if (res.ok) {
        alert("Application approved successfully! Student has been created and enrolled in courses.");
        setShowApproveModal(null);
        setSelectedSectionId("");
        // Small delay to ensure database update is complete, then refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        await load(); // Refresh the list
      } else {
        alert(`Failed to approve application: ${json.error || "Unknown error"}`);
        console.error("Error approving application:", json);
      }
    } catch (error) {
      console.error("Error approving application:", error);
      alert(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setApproving(false);
    }
  }

  async function updateStatus(id: string, action: "approve" | "reject" | "request-info", app?: Application) {
    if (action === "approve" && app) {
      handleApproveClick(app);
      return;
    }
    
    try {
      const body =
        action === "request-info"
          ? { requestedDocuments: ["birth_certificate", "report_card"] }
          : {};
      const res = await fetch(`/api/admin/applications/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      const json = await res.json();
      
      if (res.ok) {
        // Show success message
        alert(`Application ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "updated"} successfully!`);
        // Small delay to ensure database update is complete, then refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        await load(); // Refresh the list
      } else {
        // Show detailed error
        alert(`Failed to ${action} application: ${json.error || "Unknown error"}`);
        console.error(`Error ${action}ing application:`, json);
      }
    } catch (error) {
      console.error(`Error ${action}ing application:`, error);
      alert(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
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
                  <td className="px-3 py-2 capitalize">
                    <span className={`px-2 py-1 rounded text-xs ${
                      app.status === "approved" ? "bg-green-100 text-green-800" :
                      app.status === "rejected" ? "bg-red-100 text-red-800" :
                      app.status === "pending_info" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{app.submitted_at ? new Date(app.submitted_at).toLocaleString() : "-"}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      className={`text-green-700 underline ${app.status === "approved" || app.status === "rejected" ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => app.status !== "approved" && app.status !== "rejected" && updateStatus(app.id, "approve", app)}
                      disabled={app.status === "approved" || app.status === "rejected"}
                    >
                      Approve
                    </button>
                    <button
                      className={`text-orange-700 underline ${app.status === "approved" || app.status === "rejected" ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => app.status !== "approved" && app.status !== "rejected" && updateStatus(app.id, "request-info")}
                      disabled={app.status === "approved" || app.status === "rejected"}
                    >
                      Request Info
                    </button>
                    <button
                      className={`text-red-700 underline ${app.status === "approved" || app.status === "rejected" ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => app.status !== "approved" && app.status !== "rejected" && updateStatus(app.id, "reject")}
                      disabled={app.status === "approved" || app.status === "rejected"}
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

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Approve Application</h2>
            <p className="text-gray-600 mb-4">
              Select a section to assign the student to. This will automatically enroll them in all courses for that section.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section {showApproveModal.gradeLevel && `(Grade ${showApproveModal.gradeLevel})`}
              </label>
              {loadingSections ? (
                <p className="text-sm text-gray-500">Loading sections...</p>
              ) : sections.length === 0 ? (
                <p className="text-sm text-yellow-600">
                  No sections found for this grade level. You can approve without a section and enroll manually later.
                </p>
              ) : (
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select a section (optional)</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} - Grade {section.grade_level} ({section.enrolled_count}/{section.capacity})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(null);
                  setSelectedSectionId("");
                  setSections([]);
                }}
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
