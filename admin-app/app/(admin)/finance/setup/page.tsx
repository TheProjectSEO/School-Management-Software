import { Metadata } from "next";
import { FeeSetupDashboard } from "@/components/finance/FeeSetupDashboard";

export const metadata: Metadata = {
  title: "Fee Setup | Admin Portal",
  description: "Manage fee categories, structures, and payment plans",
};

export default function FeeSetupPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <FeeSetupDashboard />
    </div>
  );
}
