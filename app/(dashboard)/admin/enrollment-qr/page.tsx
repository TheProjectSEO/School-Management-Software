"use client";

import { authFetch } from "@/lib/utils/authFetch";
import { createClient } from "@/lib/supabase/client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCodeLib from "qrcode";

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

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || "";
}

function getEnrollmentUrl(code: string) {
  return `${getBaseUrl()}/apply?qr=${encodeURIComponent(code)}`;
}

export default function EnrollmentQRPage() {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalQr, setModalQr] = useState<QRCode | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const codeExists = qrCodes.some(
    (q) => q.code.toLowerCase() === codeInput.trim().toLowerCase()
  );

  useEffect(() => {
    load();

    // Real-time subscription
    const supabase = createClient();
    const channel = supabase
      .channel("enrollment_qr_codes_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_qr_codes" },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await authFetch("/api/admin/enrollment-qr");
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
      code: codeInput.trim(),
      name: formData.get("name"),
      description: formData.get("description"),
      targetGradeLevels: (formData.get("grades") as string)?.split(",").map((g) => g.trim()).filter(Boolean),
      availableTracks: (formData.get("tracks") as string)?.split(",").map((g) => g.trim()).filter(Boolean),
      enrollmentUrl: formData.get("enrollmentUrl"),
    };
    const res = await authFetch("/api/admin/enrollment-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json();
      alert(json.error || "Failed to create QR code");
    } else {
      formRef.current?.reset();
      setCodeInput("");
    }
  }

  async function copyLink(qr: QRCode) {
    const url = getEnrollmentUrl(qr.code);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(qr.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(qr.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  const openQrModal = useCallback(async (qr: QRCode) => {
    setModalQr(qr);
    setQrDataUrl(null);
    const url = getEnrollmentUrl(qr.code);
    try {
      const dataUrl = await QRCodeLib.toDataURL(url, { width: 400, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl(null);
    }
  }, []);

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Enrollment QR Codes</h1>
        <p className="text-gray-600">Generate and track QR codes for application intake.</p>
      </div>

      <form ref={formRef} onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded p-4">
        <label className="block text-sm font-medium text-gray-800">
          Code
          <input
            name="code"
            required
            placeholder="MSU-2026-GEN"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            className={`mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring focus:border-blue-500 ${
              codeExists ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {codeExists && (
            <p className="mt-1 text-xs text-red-600">This code already exists.</p>
          )}
        </label>
        <TextInput name="name" label="Name" required placeholder="2026 General Admission" />
        <TextInput name="description" label="Description" placeholder="General admissions" />
        <TextInput name="enrollmentUrl" label="Public URL (optional)" placeholder="https://example.com/apply?qr=MSU-2026-GEN" />
        <TextInput name="grades" label="Target grades (comma-separated)" placeholder="10,11,12" />
        <TextInput name="tracks" label="Tracks (comma-separated)" placeholder="STEM,ABM,HUMSS" />
        <div className="md:col-span-2">
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={codeExists}
          >
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
                <th className="px-3 py-2 text-left">Actions</th>
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
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openQrModal(qr)}
                        className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        View QR
                      </button>
                      <button
                        type="button"
                        onClick={() => copyLink(qr)}
                        className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        {copiedId === qr.id ? "Copied!" : "Copy Link"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {qrCodes.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={8}>
                    No QR codes created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalQr && (
        <QRModal
          qr={modalQr}
          qrDataUrl={qrDataUrl}
          onClose={() => setModalQr(null)}
        />
      )}
    </main>
  );
}

function QRModal({
  qr,
  qrDataUrl,
  onClose,
}: {
  qr: QRCode;
  qrDataUrl: string | null;
  onClose: () => void;
}) {
  const url = getEnrollmentUrl(qr.code);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{qr.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR code for ${qr.code}`} className="w-64 h-64" />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
              <p className="text-gray-500 text-sm">Generating...</p>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center break-all">{url}</p>

        <div className="flex justify-center gap-3">
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`qr-${qr.code}.png`}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Download
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
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
