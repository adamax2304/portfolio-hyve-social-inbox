"use client";

import { useEffect } from "react";

/**
 * iOS Liquid Glass effect: each `.surface-panel` (and any `.liquid-card`)
 * gets a soft spotlight that follows the cursor *within* the card.
 *
 * Implementation: a single rAF-throttled mousemove listener writes
 * --card-mx and --card-my (relative %) onto the hovered card. CSS
 * uses these via radial-gradient on a ::before pseudo-element.
 */
export function LiquidSpotlight() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    let raf = 0;
    let lastEvent: MouseEvent | null = null;
    let activeEl: HTMLElement | null = null;

    function flush() {
      raf = 0;
      if (!lastEvent) return;
      const target = (lastEvent.target as Element | null)?.closest<HTMLElement>(
        ".surface-panel, .liquid-card",
      );
      if (target !== activeEl) {
        if (activeEl) {
          activeEl.style.removeProperty("--card-mx");
          activeEl.style.removeProperty("--card-my");
          activeEl.removeAttribute("data-spotlight");
        }
        activeEl = target ?? null;
        if (activeEl) activeEl.setAttribute("data-spotlight", "on");
      }
      if (activeEl) {
        const r = activeEl.getBoundingClientRect();
        const x = ((lastEvent.clientX - r.left) / r.width) * 100;
        const y = ((lastEvent.clientY - r.top) / r.height) * 100;
        activeEl.style.setProperty("--card-mx", `${x}%`);
        activeEl.style.setProperty("--card-my", `${y}%`);
      }
    }

    function handle(e: MouseEvent) {
      lastEvent = e;
      if (!raf) raf = requestAnimationFrame(flush);
    }

    function clear() {
      if (activeEl) {
        activeEl.style.removeProperty("--card-mx");
        activeEl.style.removeProperty("--card-my");
        activeEl.removeAttribute("data-spotlight");
        activeEl = null;
      }
    }

    document.addEventListener("mousemove", handle, { passive: true });
    document.addEventListener("mouseleave", clear);

    return () => {
      document.removeEventListener("mousemove", handle);
      document.removeEventListener("mouseleave", clear);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
