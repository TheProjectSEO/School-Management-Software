export const dynamic = 'force-dynamic';
import { Metadata } from "next";
import { RecordPaymentPage } from "@/components/admin/finance/RecordPaymentPage";

export const metadata: Metadata = {
  title: "Record Payment | Admin Portal",
  description: "Record manual payments for student fee accounts",
};

export default function PaymentsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <RecordPaymentPage />
    </div>
  );
}
