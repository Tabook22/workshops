import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Collab Lab · From Idea to AI Product",
  description: "Think, share, improve, vote and build together. A live innovation workshop at UTAS, Oman.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
