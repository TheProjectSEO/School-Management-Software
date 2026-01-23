import { ApplicationForm } from "@/components/apply/ApplicationForm";

export default function ApplyPage({ searchParams }: { searchParams: { qr?: string } }) {
  const qrCodeId = searchParams?.qr;
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-2">Apply to Enroll</h1>
      <p className="text-gray-700 mb-6">
        Fill out the application form below. You can return to check your status anytime with your email or reference ID.
      </p>
      <ApplicationForm qrCodeId={qrCodeId} />
    </main>
  );
}
