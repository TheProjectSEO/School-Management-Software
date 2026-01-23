"use client";

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
  const [result, setResult] = useState<{ applicationId?: string; error?: string } | null>(null);

  const onChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/applications", {
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
        // Upload documents if provided
        if (applicationId) {
          await uploadIfPresent(applicationId, "birth_certificate", form.birthCertificateFile);
          await uploadIfPresent(applicationId, "report_card", form.reportCardFile);
          await uploadIfPresent(applicationId, "photo", form.photoIdFile);
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
        <Input
          label="Last Grade Completed"
          value={form.lastGradeCompleted}
          onChange={(v) => onChange("lastGradeCompleted", v)}
        />
        <Input
          label="Applying For Grade"
          value={form.applyingForGrade}
          required
          onChange={(v) => onChange("applyingForGrade", v)}
        />
        <Input label="Preferred Track" value={form.preferredTrack} onChange={(v) => onChange("preferredTrack", v)} />
        <Input
          label="How did you hear about us?"
          value={form.howDidYouHear}
          onChange={(v) => onChange("howDidYouHear", v)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FileInput
          label="Birth Certificate (PDF/JPG/PNG)"
          onChange={(file) => onChange("birthCertificateFile", file)}
        />
        <FileInput
          label="Report Card (PDF/JPG/PNG)"
          onChange={(file) => onChange("reportCardFile", file)}
        />
        <FileInput label="Photo ID" onChange={(file) => onChange("photoIdFile", file)} />
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
          <span className="text-green-700">Submitted! Reference: {result.applicationId}</span>
        )}
        {result?.error && <span className="text-red-600">{result.error}</span>}
      </div>
    </form>
  );
}

async function uploadIfPresent(applicationId: string, documentType: string, file?: File | null) {
  if (!file) return;
  const res = await fetch("/api/applications/documents/create-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicationId,
      documentType,
      fileName: file.name,
      fileType: file.type,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.uploadUrl) {
    console.error("Failed to get upload URL", json.error);
    return;
  }
  await fetch(json.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-sm font-medium text-gray-800">
      {label}
      <select
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:border-blue-500"
        value={value}
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
