import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "OpenAgents Social Studio",
  description: "Vercel-hosted n8n scheduler UI for planning and publishing X posts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
