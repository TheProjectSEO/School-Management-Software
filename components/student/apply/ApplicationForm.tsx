"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState } from "react";

type FormState = {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  gender: "male" | "female" | "other" | "";
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianRelation: string;
  previousSchool: string;
  lastGradeCompleted: string;
  applyingForGrade: string;
  preferredTrack: string;
  howDidYouHear: string;
  birthCertificateFile?: File | null;
  reportCardFile?: File | null;
  photoIdFile?: File | null;
};

const initialState: FormState = {
  firstName: "",
  lastName: "",
  middleName: "",
  email: "",
  phone: "",
  address: "",
  birthDate: "",
  gender: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  guardianRelation: "",
  previousSchool: "",
  lastGradeCompleted: "",
  applyingForGrade: "",
  preferredTrack: "",
  howDidYouHear: "",
  birthCertificateFile: null,
  reportCardFile: null,
  photoIdFile: null,
};

export function ApplicationForm({ qrCodeId }: { qrCodeId?: string }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'pending' | 'uploading' | 'done' | 'error'>>({});
  const [result, setResult] = useState<{ applicationId?: string; error?: string } | null>(null);

  const onChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onFileChange = (key: keyof FormState, file: File | null) => {
    setForm((prev) => ({ ...prev, [key]: file }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await authFetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          qrCodeId,
          birthCertificateFile: undefined,
          reportCardFile: undefined,
          photoIdFile: undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({ error: json.error || "Failed to submit application" });
      } else {
        const applicationId = json.applicationId as string | undefined;
        const uploadToken = json.uploadToken as string | undefined;
        // Upload documents if provided — show progress per file
        if (applicationId && uploadToken) {
          const uploads: Array<{ key: string; docType: string; file: File | null | undefined }> = [
            { key: "birth_certificate", docType: "birth_certificate", file: form.birthCertificateFile },
            { key: "report_card", docType: "report_card", file: form.reportCardFile },
            { key: "photo", docType: "photo", file: form.photoIdFile },
          ];
          const progress: Record<string, 'pending' | 'uploading' | 'done' | 'error'> = {};
          for (const { key, file } of uploads) {
            if (file) progress[key] = 'pending';
          }
          setUploadProgress(progress);

          for (const { key, docType, file } of uploads) {
            if (!file) continue;
            setUploadProgress((prev) => ({ ...prev, [key]: 'uploading' }));
            const ok = await uploadIfPresent(applicationId, docType, file, uploadToken);
            setUploadProgress((prev) => ({ ...prev, [key]: ok ? 'done' : 'error' }));
          }
        }
        setResult({ applicationId: json.applicationId });
        setForm(initialState);
      }
    } catch (err) {
      console.error(err);
      setResult({ error: "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="First Name" value={form.firstName} required onChange={(v) => onChange("firstName", v)} />
        <Input label="Last Name" value={form.lastName} required onChange={(v) => onChange("lastName", v)} />
        <Input label="Middle Name" value={form.middleName} onChange={(v) => onChange("middleName", v)} />
        <Input label="Email" type="email" value={form.email} required onChange={(v) => onChange("email", v)} />
        <Input label="Phone" value={form.phone} onChange={(v) => onChange("phone", v)} />
        <Input label="Address" value={form.address} onChange={(v) => onChange("address", v)} />
        <Input label="Birth Date" type="date" value={form.birthDate} onChange={(v) => onChange("birthDate", v)} />
        <Select
          label="Gender"
          value={form.gender}
          onChange={(v) => onChange("gender", v as FormState["gender"])}
          options={[
            { value: "", label: "Select gender" },
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
          ]}
        />
        <Input label="Guardian Name" value={form.guardianName} onChange={(v) => onChange("guardianName", v)} />
        <Input label="Guardian Phone" value={form.guardianPhone} onChange={(v) => onChange("guardianPhone", v)} />
        <Input label="Guardian Email" value={form.guardianEmail} onChange={(v) => onChange("guardianEmail", v)} />
        <Input
          label="Guardian Relation"
          value={form.guardianRelation}
          onChange={(v) => onChange("guardianRelation", v)}
        />
        <Input
          label="Previous School"
          value={form.previousSchool}
          onChange={(v) => onChange("previousSchool", v)}
        />
        <Select
          label="Last Grade Completed"
          value={form.lastGradeCompleted}
          onChange={(v) => onChange("lastGradeCompleted", v)}
          options={[
            { value: "", label: "Select grade" },
            { value: "Kindergarten", label: "Kindergarten" },
            ...Array.from({ length: 12 }, (_, i) => ({
              value: String(i + 1),
              label: `Grade ${i + 1}`,
            })),
          ]}
        />
        <Select
          label="Applying For Grade"
          value={form.applyingForGrade}
          required
          onChange={(v) => {
            onChange("applyingForGrade", v);
            // Clear track if grade doesn't need one
            if (Number(v) < 11) onChange("preferredTrack", "");
          }}
          options={[
            { value: "", label: "Select grade" },
            ...Array.from({ length: 12 }, (_, i) => ({
              value: String(i + 1),
              label: `Grade ${i + 1}`,
            })),
          ]}
        />
        {Number(form.applyingForGrade) >= 11 && (
          <Select
            label="Preferred Track"
            value={form.preferredTrack}
            onChange={(v) => onChange("preferredTrack", v)}
            options={[
              { value: "", label: "Select track" },
              { value: "STEM", label: "STEM" },
              { value: "ABM", label: "ABM" },
              { value: "HUMSS", label: "HUMSS" },
              { value: "GAS", label: "GAS" },
              { value: "TVL", label: "TVL" },
              { value: "Sports", label: "Sports" },
              { value: "Arts & Design", label: "Arts & Design" },
            ]}
          />
        )}
        <Input
          label="How did you hear about us?"
          value={form.howDidYouHear}
          onChange={(v) => onChange("howDidYouHear", v)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FileInput
          label="Birth Certificate (PDF/JPG/PNG)"
          onChange={(file) => onFileChange("birthCertificateFile", file)}
        />
        <FileInput
          label="Report Card (PDF/JPG/PNG)"
          onChange={(file) => onFileChange("reportCardFile", file)}
        />
        <FileInput label="Photo ID" onChange={(file) => onFileChange("photoIdFile", file)} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
        {result?.applicationId && (
          <div className="text-green-700 space-y-1">
            <p className="font-medium">Application submitted! Reference: {result.applicationId}</p>
            {Object.keys(uploadProgress).length > 0 && (
              <ul className="text-sm space-y-0.5">
                {uploadProgress.birth_certificate && (
                  <li>Birth Certificate: {uploadProgress.birth_certificate === 'done' ? '✓ Uploaded' : uploadProgress.birth_certificate === 'error' ? '✗ Upload failed' : '⏳ Uploading...'}</li>
                )}
                {uploadProgress.report_card && (
                  <li>Report Card: {uploadProgress.report_card === 'done' ? '✓ Uploaded' : uploadProgress.report_card === 'error' ? '✗ Upload failed' : '⏳ Uploading...'}</li>
                )}
                {uploadProgress.photo && (
                  <li>Photo ID: {uploadProgress.photo === 'done' ? '✓ Uploaded' : uploadProgress.photo === 'error' ? '✗ Upload failed' : '⏳ Uploading...'}</li>
                )}
              </ul>
            )}
          </div>
        )}
        {result?.error && <span className="text-red-600">{result.error}</span>}
      </div>
    </form>
  );
}

async function uploadIfPresent(
  applicationId: string,
  documentType: string,
  file: File | null | undefined,
  uploadToken: string
): Promise<boolean> {
  if (!file) return true;
  try {
    const res = await fetch("/api/applications/documents/create-upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        documentType,
        fileName: file.name,
        fileType: file.type,
        uploadToken,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.uploadUrl) {
      console.error("Failed to get upload URL", json.error);
      return false;
    }
    const uploadRes = await fetch(json.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    return uploadRes.ok;
  } catch (err) {
    console.error("Upload failed:", err);
    return false;
  }
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-gray-800">
      {label}
      <input
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:border-blue-500"
        value={value}
        type={type}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function FileInput({ label, onChange }: { label: string; onChange: (file: File | null) => void }) {
  return (
    <label className="block text-sm font-medium text-gray-800">
      {label}
      <input
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:border-blue-500"
        type="file"
        accept=".pdf,image/*"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-gray-800">
      {label}
      <select
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:border-blue-500"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
