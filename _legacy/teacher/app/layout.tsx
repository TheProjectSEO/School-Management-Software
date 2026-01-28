import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MSU Teacher Portal',
  description: 'Mindanao State University Teacher Web App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
