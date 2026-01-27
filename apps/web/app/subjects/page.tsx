import { redirect } from 'next/navigation';

// Redirect old /subjects URLs to /student/subjects
export default function LegacySubjectsRedirect() {
  redirect('/student/subjects');
}
