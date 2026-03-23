export const dynamic = 'force-dynamic';
import { Metadata } from "next";
import { FeeSetupDashboard } from "@/components/admin/finance/FeeSetupDashboard";

export const metadata: Metadata = {
  title: "Fee Setup | Admin Portal",
  description: "Manage fee categories, structures, and payment plans",
};

export default function FeeSetupPage() {
  return (
    <div>
      <FeeSetupDashboard />
    </div>
  );
}
