import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./design-system.css";

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

export const viewport: Viewport = { themeColor: "#101216", viewportFit: "cover" };

const themeScript = "try{var p=localStorage.getItem('ai-collab-theme');if(p!=='dark'&&p!=='light')p=window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=p}catch(e){}try{if(localStorage.getItem('ai-collab-lang')==='ar'){document.documentElement.lang='ar';document.documentElement.dir='rtl'}}catch(e){}";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&family=Noto+Sans+Arabic:wght@400;600;700&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
