"use client";

import { Check, Globe } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { setLocale as setLocaleAction } from "@/app/actions";
import {
  LOCALES,
  LOCALE_FLAGS,
  LOCALE_LABELS,
  type Locale,
} from "@/lib/i18n/locale";

const POPOVER_W = 220;
const GAP = 6;

type Props = {
  /** The current locale — pass from the server component so there's no flash. */
  locale: Locale;
};

export function LanguageSwitcher({ locale: initialLocale }: Props) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Optimistic locale for instant UI feedback before the page reloads
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Reposition popover on open / scroll / resize
  useEffect(() => {
    if (!open) { setCoords(null); return; }
    function update() {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const top = r.bottom + GAP;
      let left = r.right - POPOVER_W;
      if (left < 8) left = 8;
      if (left > window.innerWidth - POPOVER_W - 8) left = window.innerWidth - POPOVER_W - 8;
      setCoords({ top, left });
    }
    update();
    let raf = 0;
    const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onMove); window.removeEventListener("resize", onMove); };
  }, [open]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function pick(l: Locale) {
    if (l === locale || pending) { setOpen(false); return; }
    setLocaleState(l);  // optimistic
    setOpen(false);
    startTransition(() => {
      setLocaleAction(l).then(() => {
        if (typeof window !== "undefined") window.location.reload();
      });
    });
  }

  const popover = open && coords ? (
    <div
      ref={popRef}
      role="dialog"
      aria-label="Language"
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: POPOVER_W,
        zIndex: 2147483600,
        backgroundColor: "var(--bg-panel)",
        border: "1px solid var(--border-strong)",
        borderRadius: 14,
        boxShadow: "0 12px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.10)",
        padding: 6,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      <div style={{ padding: "6px 10px 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-faint)" }}>
        Language
      </div>
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => pick(l)}
            disabled={pending}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderRadius: 9,
              border: "none",
              backgroundColor: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
              color: "var(--text)",
              cursor: pending ? "wait" : "pointer",
              textAlign: "left",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--bg-muted)"; }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{LOCALE_FLAGS[l]}</span>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "var(--accent)" : "var(--text)" }}>
                {LOCALE_LABELS[l]}
              </span>
            </span>
            {active && <Check style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0 }} />}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Language"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={LOCALE_LABELS[locale]}
        className="lang-switcher-btn inline-flex h-9 items-center gap-1 rounded-full px-2.5 shrink-0 select-none cursor-pointer"
        style={{
          backgroundColor: "color-mix(in srgb, var(--bg-muted) 80%, transparent)",
          border: "0.5px solid var(--border)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <Globe
          style={{ width: 14, height: 14, color: "var(--text-secondary)", flexShrink: 0 }}
          strokeWidth={2}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "var(--text-secondary)",
            lineHeight: 1,
          }}
        >
          {locale.toUpperCase()}
        </span>
      </button>
      {mounted && popover ? createPortal(popover, document.body) : null}
    </>
  );
}
