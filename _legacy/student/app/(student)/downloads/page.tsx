import { redirect } from "next/navigation";
import { getCurrentStudent, getDownloads, getDownloadStats } from "@/lib/dal";
import DownloadsClient from "./DownloadsClient";

export const revalidate = 300; // 5 minutes - downloads list

export default async function DownloadsPage() {
  // Get current student
  const student = await getCurrentStudent();

  // Redirect to login if no student
  if (!student) {
    redirect("/login");
  }

  // Fetch downloads and stats
  const [downloads, stats] = await Promise.all([
    getDownloads(student.id),
    getDownloadStats(student.id),
  ]);

  return <DownloadsClient downloads={downloads} stats={stats} />;
}
