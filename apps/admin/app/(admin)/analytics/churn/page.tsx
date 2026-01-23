import { Metadata } from "next";
import { ChurnPredictionDashboard } from "@/components/analytics/ChurnPredictionDashboard";

export const metadata: Metadata = {
  title: "Churn Prediction | Admin Portal",
  description: "Predict and prevent student churn with AI-powered analytics",
};

export default function ChurnPredictionPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <ChurnPredictionDashboard />
    </div>
  );
}
