import type { Metadata } from "next";
import type { ReactNode } from "react";
import { assets } from "@/lib/assets";
import "./globals.css";

export const metadata: Metadata = {
  title: "isplay | Understand your agent's decisions",
  description: "Replayable infrastructure for agent investigations.",
  metadataBase: new URL("https://isplay.dev"),
  alternates: {
    canonical: "https://isplay.dev",
  },
  openGraph: {
    title: "isplay | Understand your agent's decisions",
    description: "Replayable infrastructure for agent investigations.",
    images: [assets.ogImage],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "isplay | Understand your agent's decisions",
    description: "Replayable infrastructure for agent investigations.",
    images: [assets.ogImage],
  },
  icons: {
    icon: assets.favicon,
    apple: assets.appleTouchIcon,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      data-wf-domain="www.isplay.dev"
      data-wf-page="691621ffb0674afe0d3ebacd"
      data-wf-site="691621fbb0674afe0d3eb98c"
      data-scroll-behavior="smooth"
      lang="en"
      className="w-mod-js w-mod-ix w-mod-ix3 dark"
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
