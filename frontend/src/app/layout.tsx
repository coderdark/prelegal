import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prelegal — Legal Document Creator",
  description: "Draft legal agreements in minutes with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
