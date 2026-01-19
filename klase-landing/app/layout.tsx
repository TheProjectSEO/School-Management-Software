export const metadata = {
  title: 'klase.ph',
  description: 'Unified login portals for students, teachers, and admin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, ui-sans-serif, system-ui' }}>{children}</body>
    </html>
  );
}

