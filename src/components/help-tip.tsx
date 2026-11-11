"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/provider";

type Props = {
  title: string;
  steps: string[];
  link?: { href: string; label: string };
};

const POPOVER_W = 300; // px — must match style below

/**
 * Subtle "?" icon next to API/credential fields.
 * Opens a popover rendered via `createPortal` to <body> with `position: fixed`
 * so it ALWAYS floats above sticky panels, cards, modals, accordions, etc.
 * Auto-flips above when there's no room below; horizontally clamps to viewport.
 */
export function HelpTip({ title, steps, link }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: "top" | "bottom" } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Recompute position whenever open changes OR window resizes/scrolls
  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;

    function recompute() {
      const wrap = wrapRef.current;
      const pop = popoverRef.current;
      if (!wrap) return;
      const btn = wrap.getBoundingClientRect();
      const popH = pop?.offsetHeight ?? 220; // estimated until rendered
      const margin = 12;

      const spaceAbove = btn.top - margin;
      const spaceBelow = window.innerHeight - btn.bottom - margin;

      let placement: "top" | "bottom" = "bottom";
      if (popH <= spaceBelow) placement = "bottom";
      else if (popH <= spaceAbove) placement = "top";
      else placement = spaceAbove >= spaceBelow ? "top" : "bottom";

      const top =
        placement === "bottom"
          ? btn.bottom + 8
          : btn.top - popH - 8;

      // Horizontal: prefer the popover to extend to the LEFT of the icon
      // (right edge aligned with icon's right), then clamp to viewport.
      let left = btn.right - POPOVER_W;
      if (left < margin) left = margin;
      if (left + POPOVER_W > window.innerWidth - margin) {
        left = window.innerWidth - margin - POPOVER_W;
      }

      setCoords({ top, left, placement });
    }

    recompute();
    // Re-run once after the portal renders (so we have a real popover height)
    const id = requestAnimationFrame(recompute);
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [open]);

  const popoverNode =
    open && coords ? (
      <div
        ref={popoverRef}
        role="dialog"
        className="rounded-2xl p-4"
        style={{
          position: "fixed",
          top: coords.top,
          left: coords.left,
          width: POPOVER_W,
          zIndex: 2147483600, // float above everything (incl. modals at 2147483600 base)
          backgroundColor: "var(--bg-panel)",
          border: "0.5px solid var(--border)",
          boxShadow:
            "0 0.5px 1px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.10), 0 16px 48px rgba(0,0,0,0.10)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <p
            className="text-xs font-bold uppercase tracking-[0.1em]"
            style={{ color: "var(--accent)" }}
          >
            {title}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[var(--text-faint)] hover:text-[var(--text)]"
            aria-label={t("help.closeTip")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <ol className="mt-2 space-y-1.5">
          {steps.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs leading-5"
              style={{ color: "var(--text-secondary)" }}
            >
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                style={{
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
              >
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        {link ? (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold hover:underline"
            style={{ color: "var(--accent)" }}
          >
            {link.label} →
          </a>
        ) : null}
      </div>
    ) : null;

  return (
    <span ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border transition hover:opacity-80"
        style={{
          borderColor: "var(--border)",
          color: "var(--accent)",
          backgroundColor: open ? "var(--accent-soft)" : "transparent",
        }}
        aria-label={t("help.findWhere")}
        aria-expanded={open}
      >
        <HelpCircle className="h-3 w-3" />
      </button>
      {mounted && popoverNode ? createPortal(popoverNode, document.body) : null}
    </span>
  );
}
