import type { ReactNode } from "react";
import { assets } from "@/lib/assets";
import { ArrowIcon } from "./Icons";

const tagVariantClass = {
  black: "",
  gray: " w-variant-17b0f1a6-c3e9-73b3-2ef4-a696fc2c91cf",
  blue: " w-variant-59cc7cf6-8430-e269-6f86-2347855689b5",
} as const;

const tagVariantValue = {
  black: "black",
  gray: "gray",
  blue: "blue",
} as const;

type TagVariant = keyof typeof tagVariantClass;

export function Tag({
  children,
  variant = "black",
  fade = "opacity",
  shuffle = "scroll",
}: {
  children: ReactNode;
  variant?: TagVariant;
  fade?: string;
  shuffle?: string;
}) {
  return (
    <div data-fade-in={fade} shuffle={shuffle} data-wf--comp_tag--variant={tagVariantValue[variant]} className={`tag-component${tagVariantClass[variant]}`}>
      <div shuffle="el" className="t-label-3-rg">
        <div className="t-label-2-rg">{children}</div>
      </div>
    </div>
  );
}

const buttonVariants = {
  white: {
    className: "button-icon w-variant-89642d93-d9a2-f338-ea0d-5c72143d66dc w-inline-block",
    iconClass: "button-icon-box is-big w-variant-89642d93-d9a2-f338-ea0d-5c72143d66dc",
    wf: "white",
    labelClass: "t-label-2-rg is-btn",
  },
  transparent: {
    className: "button-icon w-variant-e48873ed-272b-1da1-0fb2-a7bd7e18ddf9 w-inline-block",
    iconClass: "button-icon-box is-big w-variant-e48873ed-272b-1da1-0fb2-a7bd7e18ddf9",
    wf: "transparent",
    labelClass: "t-label-2-rg is-btn",
  },
  navbar: {
    className: "button-icon is-navbar w-inline-block",
    iconClass: "button-icon-box",
    wf: undefined,
    labelClass: "t-label-3-rg is-btn",
  },
} as const;

type ButtonVariant = keyof typeof buttonVariants;

export function ButtonIcon({
  label,
  href,
  variant,
  eventName,
}: {
  label: string;
  href: string;
  variant: ButtonVariant;
  eventName?: string;
}) {
  const config = buttonVariants[variant];

  return (
    <a
      data-umami-event={eventName}
      shuffle="true"
      data-wf--comp_button-big--variant={config.wf}
      href={href}
      className={config.className}
    >
      <div shuffle="el" className={config.labelClass}>
        {label}
      </div>
      <div className={config.iconClass}>
        <ArrowIcon className={variant === "navbar" ? "icon-embed-20" : "icon-embed-xsmall"} />
      </div>
    </a>
  );
}

export function CornerMarks({ bottomLeft = false }: { bottomLeft?: boolean }) {
  return (
    <>
      <img src={assets.corner} loading="eager" alt="" className="card_icon-corner is-top-left" />
      <img src={assets.corner} loading="eager" alt="" className="card_icon-corner is-top-right" />
      {bottomLeft ? <img src={assets.corner} loading="eager" alt="" className="card_icon-corner is-bottom-left" /> : null}
      <img src={assets.corner} loading="eager" alt="" className="card_icon-corner is-bottom-right" />
    </>
  );
}
