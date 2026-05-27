"use client";

import { useEffect } from "react";
import { assets } from "@/lib/assets";
import { observeLottieFallbacks } from "./lottieFallback";
import { initVideoScrollTriggers } from "./media";
import { initShuffleHover } from "./shuffle";
import { loadScript } from "./scriptLoader";
import { initFooterWaves, initHeroWaves } from "./waves";

declare global {
  interface Window {
    Webflow?: {
      ready?: () => void;
    };
    gsap?: {
      registerPlugin?: (...plugins: unknown[]) => void;
    };
    ScrollTrigger?: unknown;
    SplitText?: unknown;
  }
}

export function IsplayRuntime() {
  useEffect(() => {
    let mounted = true;
    const cleanups: Array<() => void> = [];
    const finishInitialReveal = () => {
      if (!mounted) return;
      document.documentElement.classList.remove("wf-ix3-loading");
      document.documentElement.classList.add("wf-ix3-revealed");
    };
    const revealFallback = window.setTimeout(finishInitialReveal, 1500);

    document.documentElement.classList.add("w-mod-js");
    if ("ontouchstart" in window) document.documentElement.classList.add("w-mod-touch");
    window.addEventListener("__wf_ix3_ready", finishInitialReveal, { once: true });

    const year = document.getElementById("current-year");
    if (year) year.textContent = String(new Date().getFullYear());
    document.documentElement.classList.add("w-mod-ix", "w-mod-ix3");

    cleanups.push(observeLottieFallbacks());
    cleanups.push(initShuffleHover());
    cleanups.push(initHeroWaves());
    cleanups.push(initFooterWaves());
    cleanups.push(initVideoScrollTriggers());

    async function enhance() {
      await loadScript(assets.scripts.jquery);
      await loadScript(assets.scripts.gsap);
      await loadScript(assets.scripts.scrollTrigger);
      await loadScript(assets.scripts.splitText);
      window.gsap?.registerPlugin?.(window.ScrollTrigger, window.SplitText);
      await loadScript(assets.scripts.webflow);
      if (!mounted) return;

      window.Webflow?.ready?.();
      document.documentElement.classList.add("w-mod-ix", "w-mod-ix3");
    }

    enhance().catch((error) => {
      console.error("Failed to initialize Webflow enhancement", error);
      finishInitialReveal();
    });

    return () => {
      mounted = false;
      window.clearTimeout(revealFallback);
      window.removeEventListener("__wf_ix3_ready", finishInitialReveal);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
