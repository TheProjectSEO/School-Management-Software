import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

// Redirect old /subjects/[id] URLs to /student/subjects/[id]
export default async function LegacySubjectRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/student/subjects/${id}`);
}
