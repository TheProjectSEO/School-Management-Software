import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientAuthProvider } from "@/components/auth/ClientAuthProvider";

export const metadata: Metadata = {
  title: {
    default: "MSU School Management System",
    template: "%s | MSU SMS",
  },
  description: "Unified school management platform for Mindanao State University - students, teachers, and administrators",
  keywords: ["school management", "MSU", "Mindanao State University", "education", "student portal", "teacher portal"],
  authors: [{ name: "Mindanao State University" }],
  creator: "Mindanao State University",
  publisher: "Mindanao State University",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://klase.ph"),
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: "MSU School Management System",
    title: "MSU School Management System",
    description: "Unified school management platform for Mindanao State University",
  },
  twitter: {
    card: "summary_large_image",
    title: "MSU School Management System",
    description: "Unified school management platform for Mindanao State University",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#7B1113",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="antialiased">
        <ClientAuthProvider>
          {children}
        </ClientAuthProvider>
      </body>
    </html>
  );
}
