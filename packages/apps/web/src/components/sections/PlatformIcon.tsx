import type { enterpriseCards } from "@/lib/content";
import type { ReactNode } from "react";

type PlatformIconKind = (typeof enterpriseCards)[number]["icon"];

function CaptureIcon() {
  return (
    <>
      <circle cx="60" cy="60" r="33" />
      <path d="M60 24v72M24 60h72M36 36c13 11 35 11 48 0M36 84c13-11 35-11 48 0" />
      <path d="M44 28c-9 20-9 44 0 64M76 28c9 20 9 44 0 64" />
    </>
  );
}

function ReplayIcon() {
  return (
    <>
      {Array.from({ length: 9 }, (_, index) => (
        <path key={index} d={`M${28 + index * 8} 22c${index % 2 ? -7 : 7} 16 ${index % 2 ? -7 : 7} 60 0 76`} />
      ))}
    </>
  );
}

function BranchIcon() {
  return (
    <>
      <path d="M24 86c25 0 31-52 72-52" />
      <path d="M24 34c27 0 38 52 72 52" />
      <path d="M60 60h36" />
      <circle cx="24" cy="34" r="4" />
      <circle cx="24" cy="86" r="4" />
      <circle cx="96" cy="34" r="4" />
      <circle cx="96" cy="86" r="4" />
    </>
  );
}

function EffectsIcon() {
  return (
    <>
      <path d="M28 92h64" />
      <path d="M36 92V58M54 92V36M72 92V48M90 92V24" />
      <path d="M31 53l21-19 20 11 19-22" />
      <path d="M82 23h9v9" />
    </>
  );
}

function ValidityIcon() {
  return (
    <>
      <path d="M60 22l32 15v24c0 23-14 34-32 43-18-9-32-20-32-43V37z" />
      <path d="M43 61l12 12 24-28" />
      <path d="M40 92h40" />
    </>
  );
}

export function PlatformIcon({ kind }: { kind: PlatformIconKind }) {
  const icons: Record<PlatformIconKind, ReactNode> = {
    capture: <CaptureIcon />,
    replay: <ReplayIcon />,
    branch: <BranchIcon />,
    effects: <EffectsIcon />,
    validity: <ValidityIcon />,
  };

  return (
    <svg className="platform-static-icon" viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        {icons[kind]}
      </g>
    </svg>
  );
}
