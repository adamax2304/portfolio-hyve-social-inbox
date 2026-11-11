"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles, Bot, Power } from "lucide-react";
import { setAiPreset } from "@/app/actions";
import { useTranslation } from "@/lib/i18n/provider";

type Props = {
  tenantSlug: string;
  currentMode: string;
  collectOrders: boolean;
  /** "compact" → icons + dot indicator (chat header); "full" → labelled pills */
  size?: "compact" | "full";
};

export function AiPresetSwitcher({
  tenantSlug,
  currentMode,
  collectOrders,
  size = "full",
}: Props) {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const presets = [
    { value: "SUGGEST",     label: t("workspace.aiPresetSuggestLabel"), short: t("workspace.aiPresetSuggestShort"), desc: t("workspace.aiPresetSuggestDesc"), Icon: Sparkles },
    { value: "AUTO_ORDERS", label: t("workspace.aiPresetAutoLabel"),    short: t("workspace.aiPresetAutoShort"),    desc: t("workspace.aiPresetAutoDesc"),    Icon: Bot },
    { value: "OFF",         label: t("workspace.aiPresetOffLabel"),     short: t("workspace.aiPresetOffShort"),     desc: t("workspace.aiPresetOffDesc"),     Icon: Power },
  ];

  const current =
    currentMode === "OFF"
      ? "OFF"
      : collectOrders
      ? "AUTO_ORDERS"
      : "SUGGEST";
  const activeIdx = presets.findIndex((p) => p.value === current);
  const activePreset = presets[activeIdx];

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function pick(value: string) {
    if (pending || value === current) return;
    const next = presets.find((p) => p.value === value);
    if (next) setToast(t("workspace.aiPresetToast", { label: next.label }));
    const fd = new FormData();
    fd.set("tenantSlug", tenantSlug);
    fd.set("preset", value);
    startTransition(async () => {
      try {
        await setAiPreset(fd);
      } catch (e) {
        console.error(e);
      }
    });
  }

  const compact = size === "compact";

  return (
    <div className="relative inline-flex flex-col items-center">
      <div
        className="ai-switcher relative inline-flex items-center rounded-full"
        role="radiogroup"
        style={{
          padding: compact ? "3px" : "4px",
          backgroundColor: "color-mix(in srgb, var(--bg-muted) 80%, transparent)",
          border: "0.5px solid var(--border)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <span
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            top: compact ? 3 : 4,
            bottom: compact ? 3 : 4,
            left: `calc(${(100 / presets.length) * activeIdx}% + ${compact ? 3 : 4}px)`,
            width: `calc(${100 / presets.length}% - ${compact ? 6 : 8}px)`,
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--accent) 105%, white 6%), var(--accent))",
            boxShadow:
              "0 1px 3px color-mix(in srgb, var(--accent) 30%, transparent), 0 0 0 0.5px rgba(0,0,0,0.06)",
            transition:
              "left 0.42s cubic-bezier(0.32, 0.72, 0, 1), background 0.3s ease",
          }}
        />
        {presets.map((p) => {
          const isActive = p.value === current;
          return (
            <button
              key={p.value}
              type="button"
              disabled={pending}
              onClick={() => pick(p.value)}
              title={`${p.label} — ${p.desc}`}
              aria-label={p.label}
              className="relative z-10 inline-flex items-center justify-center gap-1 rounded-full font-bold transition disabled:opacity-60"
              style={
                compact
                  ? {
                      width: 38,
                      height: 28,
                      color: isActive ? "#ffffff" : "var(--text-muted)",
                    }
                  : {
                      flex: 1,
                      minWidth: 110,
                      padding: "6px 12px",
                      fontSize: 11,
                      color: isActive ? "#ffffff" : "var(--text-muted)",
                    }
              }
            >
              <p.Icon
                className={compact ? "h-4 w-4" : "h-3 w-3"}
                strokeWidth={isActive ? 2.6 : 2}
                style={{ marginRight: compact ? 0 : 6 }}
              />
              {!compact ? p.label : null}
            </button>
          );
        })}
      </div>

      {/* Tiny status label under the compact switcher (chat-header use case) */}
      {compact ? (
        <span
          className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
          style={{
            color: "var(--accent)",
            backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)",
          }}
        >
          <span
            className="h-1 w-1 rounded-full"
            style={{
              backgroundColor: current === "OFF" ? "var(--text-faint)" : "var(--accent)",
            }}
          />
          {activePreset?.short}
        </span>
      ) : null}

      {/* Floating toast on mode change */}
      {toast ? (
        <div
          className="ai-toast pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold shadow-lg"
          style={{
            backgroundColor: "var(--bg-panel)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          }}
        >
          ✓ {toast}
        </div>
      ) : null}
    </div>
  );
}
