"use client";

import { useEffect } from "react";

/**
 * Tracks the cursor and writes --mouse-x / --mouse-y CSS variables on
 * <html>. Combined with the body::before radial gradient in globals.css
 * this creates a soft, theme-aware ambient glow that follows the cursor.
 *
 * No effect on touch devices (no hover support).
 */
export function MouseGlow() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(hover: hover)").matches
    ) {
      return;
    }
    const root = document.documentElement;
    let raf = 0;
    let pending: { x: number; y: number } | null = null;

    function flush() {
      raf = 0;
      if (!pending) return;
      root.style.setProperty("--mouse-x", `${pending.x}px`);
      root.style.setProperty("--mouse-y", `${pending.y}px`);
      pending = null;
    }
    function handle(e: MouseEvent) {
      pending = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(flush);
    }
    window.addEventListener("mousemove", handle, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
