import { Metadata } from "next";
import { FeeCollectionDashboard } from "@/components/finance/FeeCollectionDashboard";

export const metadata: Metadata = {
  title: "AI Fee Collection | Admin Portal",
  description: "AI-powered fee collection insights and automated reminders",
};

export default function FeeCollectionPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <FeeCollectionDashboard />
    </div>
  );
}
