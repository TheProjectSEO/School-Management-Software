import { Metadata } from "next";
import AskAIStandalone from "./AskAIStandalone";

export const metadata: Metadata = {
  title: "Ask AI | MSU Student Portal",
  description: "Your personal AI learning assistant. Ask questions about your courses, progress, and study plans.",
};

export default function AskAIPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <AskAIStandalone />
    </div>
  );
}
