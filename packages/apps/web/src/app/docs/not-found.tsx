import type { Metadata } from "next";
import Link from "next/link";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { assets } from "@/lib/assets";

const title = "Docs Page Not Found | isplay Docs";
const description = "The requested isplay documentation page could not be found.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/docs",
  },
  openGraph: {
    title,
    description,
    url: "/docs",
    images: [assets.ogImage],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [assets.ogImage],
  },
};

export default function DocsNotFound() {
  return (
    <DocsPage>
      <DocsTitle>Page Not Found</DocsTitle>
      <DocsDescription>{description}</DocsDescription>
      <DocsBody>
        <p>The page may have moved, or the URL may be incorrect.</p>
        <p>
          <Link href="/docs">Go back to the docs index</Link>.
        </p>
      </DocsBody>
    </DocsPage>
  );
}
