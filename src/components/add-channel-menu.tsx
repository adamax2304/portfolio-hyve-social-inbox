"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, Check, Camera, Phone, Send, MessageCircle, Globe } from "lucide-react";
import { CHANNELS } from "@/lib/help-content";
import { addChannelToTenant } from "@/app/actions";
import { useTranslation } from "@/lib/i18n/provider";

const ICONS: Record<string, React.ElementType> = {
  Camera,
  Phone,
  Send,
  MessageCircle,
  Globe,
};

type Props = {
  tenantSlug: string;
  /** Already-connected provider values (so we can mark them as "Connected") */
  existingProviders: string[];
};

export function AddChannelMenu({ tenantSlug, existingProviders }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click-outside / Esc to close
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
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

  function pick(provider: string) {
    if (pending) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("tenantSlug", tenantSlug);
      fd.set("provider", provider);
      try {
        await addChannelToTenant(fd);
        setOpen(false);
      } catch (e) {
        console.error("addChannelToTenant failed:", e);
      }
    });
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover-grow inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-[0.96]"
        style={{
          borderColor: open ? "var(--accent)" : "var(--border)",
          color: "var(--accent)",
          backgroundColor: open ? "var(--accent-soft)" : "transparent",
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Plus className={`h-3 w-3 transition-transform ${open ? "rotate-45" : ""}`} />
        {t("setup.addChannel")}
      </button>

      {open ? (
        <div
          role="menu"
          className="add-channel-menu absolute right-0 top-full z-50 mt-2 w-[320px] rounded-2xl border p-2 shadow-2xl"
          style={{
            backgroundColor: "var(--bg-panel)",
            borderColor: "var(--border)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.20)",
          }}
        >
          <p
            className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--text-faint)" }}
          >
            {t("setup.chooseChannel")}
          </p>
          <div className="space-y-0.5">
            {CHANNELS.map((ch) => {
              const Icon = ICONS[ch.iconName] ?? MessageCircle;
              const already = existingProviders.includes(ch.value);
              return (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => pick(ch.value)}
                  disabled={pending || already}
                  className="add-channel-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: ch.bg }}
                  >
                    <Icon className="h-4 w-4" style={{ color: ch.color }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold" style={{ color: "var(--text)" }}>
                      {ch.name}
                    </span>
                    <span className="block truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {ch.authMode}
                    </span>
                  </span>
                  {already ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em]"
                      style={{ color: "#16a34a", backgroundColor: "rgba(22,163,74,0.12)" }}
                    >
                      <Check className="h-2.5 w-2.5" />
                      {t("setup.alreadyConnected")}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <p
            className="mt-1 border-t pt-2 px-3 text-[10px] leading-snug"
            style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}
          >
            {t("setup.addChannelHint")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
