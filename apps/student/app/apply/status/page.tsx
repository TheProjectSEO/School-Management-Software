"use client";

import { useState } from "react";

export default function ApplicationStatusPage() {
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !reference) {
      setError("Enter an email or reference ID");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (reference) params.set("id", reference);

    try {
      const res = await fetch(`/api/applications?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Unable to fetch status");
      } else {
        setResult(json.application);
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-2">Check Application Status</h1>
      <p className="text-gray-700 mb-6">Use your email or reference ID to view your application status.</p>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-gray-800">
            Email
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:border-blue-500"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
            />
          </label>
          <label className="block text-sm font-medium text-gray-800">
            Reference ID
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:border-blue-500"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Application ID"
            />
          </label>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Checking..." : "Check Status"}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {result && (
        <div className="mt-6 rounded border border-gray-200 p-4">
          <p className="font-semibold">Status: {result.status}</p>
          {result.rejection_reason && <p className="text-red-700">Reason: {result.rejection_reason}</p>}
          {Array.isArray(result.requested_documents) && result.requested_documents.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">Requested documents:</p>
              <ul className="list-disc list-inside text-gray-800">
                {result.requested_documents.map((doc: string) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
