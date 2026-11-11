"use client";

import { Sun, Moon, Droplet } from "lucide-react";
import { useTransition } from "react";
import { setTheme as setThemeAction } from "@/app/actions";
import type { Theme } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n/provider";

type ThemeDef = { value: Theme; labelKey: "theme.light" | "theme.dark" | "theme.blue"; Icon: React.ElementType };

const themes: ThemeDef[] = [
  { value: "light", labelKey: "theme.light", Icon: Sun },
  { value: "dark",  labelKey: "theme.dark",  Icon: Moon },
  { value: "blue",  labelKey: "theme.blue",  Icon: Droplet },
];

// Geometry — kept in sync so the pill aligns 1:1 with each cell.
const CELL_W = 36;     // width of each tap target
const CELL_H = 30;     // height of each tap target
const PAD    = 3;      // padding inside the rounded wrapper
const PILL_INSET = 1;  // inset of the pill within its cell (visual breathing room)

export function ThemeSwitcher({ current }: { current: Theme }) {
  const [pending, startTransition] = useTransition();
  const { t } = useTranslation();
  const activeIdx = themes.findIndex((th) => th.value === current);

  function handle(theme: Theme) {
    if (pending || theme === current) return;
    document.documentElement.setAttribute("data-theme", theme);
    startTransition(() => {
      setThemeAction(theme);
    });
  }

  return (
    <div
      className="theme-switcher relative inline-flex items-center rounded-full"
      role="group"
      aria-label={t("theme.label")}
      style={{
        padding: `${PAD}px`,
        backgroundColor: "color-mix(in srgb, var(--bg-muted) 80%, transparent)",
        border: "0.5px solid var(--border)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      {/* Sliding indicator pill — fixed origin, moves via transform */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          top: PAD + PILL_INSET,
          left: PAD + PILL_INSET,
          height: CELL_H - PILL_INSET * 2,
          width: CELL_W - PILL_INSET * 2,
          transform: `translateX(${activeIdx * CELL_W}px)`,
          willChange: "transform",
          backgroundColor: "var(--bg-panel)",
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)",
          transition:
            "transform 0.42s cubic-bezier(0.32, 0.72, 0, 1), background-color 0.3s ease",
        }}
      />

      {themes.map((th) => {
        const isActive = th.value === current;
        const label = t(th.labelKey);
        return (
          <button
            key={th.value}
            type="button"
            onClick={() => handle(th.value)}
            title={label}
            aria-label={label}
            className="theme-cell relative z-10 inline-flex shrink-0 items-center justify-center"
            style={{
              width: CELL_W,
              height: CELL_H,
              color: isActive ? "var(--accent)" : "var(--text-faint)",
              transition:
                "color 0.3s, transform 0.18s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            <th.Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.4 : 2} />
          </button>
        );
      })}
    </div>
  );
}
