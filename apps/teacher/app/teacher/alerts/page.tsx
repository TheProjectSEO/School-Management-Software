import { Metadata } from "next";
import { StudentAlertsPanel } from "@/components/teacher/alerts/StudentAlertsPanel";

export const metadata: Metadata = {
  title: "Student Alerts | Teacher Portal",
  description: "Smart alerts for students who need attention",
};

export default function StudentAlertsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <StudentAlertsPanel />
    </div>
  );
}
