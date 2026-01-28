"use client";

import { useEffect, useState } from "react";

type QRCode = {
  id: string;
  code: string;
  name: string;
  description?: string;
  target_grade_levels?: string[];
  available_tracks?: string[];
  is_active: boolean;
  scan_count?: number;
  application_count?: number;
  expires_at?: string;
};

export default function EnrollmentQRPage() {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/enrollment-qr");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load QR codes");
      setQrCodes([]);
    } else {
      setQrCodes(json.qrCodes || []);
    }
    setLoading(false);
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      code: formData.get("code"),
      name: formData.get("name"),
      description: formData.get("description"),
      targetGradeLevels: (formData.get("grades") as string)?.split(",").map((g) => g.trim()).filter(Boolean),
      availableTracks: (formData.get("tracks") as string)?.split(",").map((g) => g.trim()).filter(Boolean),
      enrollmentUrl: formData.get("enrollmentUrl"),
    };
    const res = await fetch("/api/admin/enrollment-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json();
      alert(json.error || "Failed to create QR code");
    } else {
      event.currentTarget.reset();
      await load();
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Enrollment QR Codes</h1>
        <p className="text-gray-600">Generate and track QR codes for application intake.</p>
      </div>

      <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded p-4">
        <TextInput name="code" label="Code" required placeholder="MSU-2026-GEN" />
        <TextInput name="name" label="Name" required placeholder="2026 General Admission" />
        <TextInput name="description" label="Description" placeholder="General admissions" />
        <TextInput name="enrollmentUrl" label="Public URL (optional)" placeholder="https://example.com/apply?qr=MSU-2026-GEN" />
        <TextInput name="grades" label="Target grades (comma-separated)" placeholder="10,11,12" />
        <TextInput name="tracks" label="Tracks (comma-separated)" placeholder="STEM,ABM,HUMSS" />
        <div className="md:col-span-2">
          <button className="px-4 py-2 rounded bg-blue-600 text-white" type="submit">
            Create QR Code
          </button>
        </div>
      </form>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Grades</th>
                <th className="px-3 py-2 text-left">Tracks</th>
                <th className="px-3 py-2 text-left">Scans</th>
                <th className="px-3 py-2 text-left">Applications</th>
                <th className="px-3 py-2 text-left">Active</th>
              </tr>
            </thead>
            <tbody>
              {qrCodes.map((qr) => (
                <tr key={qr.id} className="border-t">
                  <td className="px-3 py-2 font-mono">{qr.code}</td>
                  <td className="px-3 py-2">{qr.name}</td>
                  <td className="px-3 py-2">{qr.target_grade_levels?.join(", ") || "-"}</td>
                  <td className="px-3 py-2">{qr.available_tracks?.join(", ") || "-"}</td>
                  <td className="px-3 py-2">{qr.scan_count ?? 0}</td>
                  <td className="px-3 py-2">{qr.application_count ?? 0}</td>
                  <td className="px-3 py-2">{qr.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
              {qrCodes.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={7}>
                    No QR codes created yet.
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

function TextInput({
  name,
  label,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-medium text-gray-800">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:border-blue-500"
      />
    </label>
  );
}
