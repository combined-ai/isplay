import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { BrandLogo } from "@/components/shared/Logo";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <BrandLogo />,
      url: "/",
    },
    links: [
      {
        type: "main",
        text: "Install",
        url: "/docs/install",
      },
    ],
    searchToggle: {
      enabled: true,
    },
    themeSwitch: {
      enabled: false,
    },
  };
}
