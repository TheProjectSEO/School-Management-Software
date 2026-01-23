/**
 * Simple layout for wrong-app page
 * This doesn't use the student layout to avoid authentication issues
 */

// Force dynamic rendering - don't prerender this page
export const dynamic = "force-dynamic";

export default function WrongAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
