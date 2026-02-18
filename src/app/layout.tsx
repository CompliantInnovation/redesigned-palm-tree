import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laina Activity Creator",
  description: "Plan builder for patient engagement activities",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
