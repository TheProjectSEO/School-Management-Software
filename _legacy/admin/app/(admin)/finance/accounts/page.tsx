import { Metadata } from "next";
import { StudentAccountsDashboard } from "@/components/finance/StudentAccountsDashboard";

export const metadata: Metadata = {
  title: "Student Accounts | Admin Portal",
  description: "View and manage student fee accounts",
};

export default function StudentAccountsPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <StudentAccountsDashboard />
    </div>
  );
}
