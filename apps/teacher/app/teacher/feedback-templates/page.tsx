import { Metadata } from "next";
import { FeedbackTemplatesPanel } from "@/components/teacher/feedback/FeedbackTemplatesPanel";

export const metadata: Metadata = {
  title: "Feedback Templates | Teacher Portal",
  description: "Create and manage reusable feedback templates for grading",
};

export default function FeedbackTemplatesPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <FeedbackTemplatesPanel />
    </div>
  );
}
