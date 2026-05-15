import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { baseOptions } from "@/lib/docs-layout";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ defaultTheme: "dark", enableSystem: false }}>
      <DocsLayout
        {...baseOptions()}
        tree={source.getPageTree()}
        sidebar={{
          banner: <div key="docs-sidebar-banner" className="docs-sidebar-banner">Replay evidence, not guesses.</div>,
          defaultOpenLevel: 1,
          prefetch: false,
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
