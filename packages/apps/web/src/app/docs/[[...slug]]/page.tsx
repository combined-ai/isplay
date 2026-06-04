import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { getMDXComponents } from "@/components/docs/mdx";
import { assets } from "@/lib/assets";
import { source } from "@/lib/source";

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const Mdx = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <Mdx components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const title = `${page.data.title} | isplay Docs`;
  const url = page.url;

  return {
    title,
    description: page.data.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: page.data.description,
      url,
      images: [assets.ogImage],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.data.description,
      images: [assets.ogImage],
    },
  };
}
