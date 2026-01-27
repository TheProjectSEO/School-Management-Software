import { ApplicationForm } from "@/components/student/apply/ApplicationForm";

export const metadata = {
  title: "Apply - Student Application",
  description: "Submit your student application",
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ qr?: string }>;
}) {
  const params = await searchParams;
  const qrCodeId = params.qr;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Student Application</h1>
            <p className="mt-2 text-gray-600">
              Please fill out the form below to submit your application.
            </p>
            {qrCodeId && (
              <p className="mt-1 text-sm text-blue-600">
                Application via QR code: {qrCodeId}
              </p>
            )}
          </div>

          <ApplicationForm qrCodeId={qrCodeId} />

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Already have an account?{" "}
              <a href="/login" className="text-blue-600 hover:text-blue-500">
                Sign in here
              </a>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Need help? Contact us at{" "}
            <a href="mailto:support@school.edu" className="text-blue-600">
              support@school.edu
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
