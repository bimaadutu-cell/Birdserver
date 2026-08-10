import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BirdServer  Powerful Server Hosting, Made Simple.",
  description: "BirdServer  Modern hosting control panel by BimzOfficial",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-grid min-h-screen antialiased">{children}</body>
    </html>
  );
}
