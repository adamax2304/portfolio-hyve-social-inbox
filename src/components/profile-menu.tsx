"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserRound, LogOut, Settings, LifeBuoy, KeyRound } from "lucide-react";
import { useTranslation } from "@/lib/i18n/provider";

type Props = {
  name: string;
  login: string; // current login (email field)
  /** Server action passed in from layout.tsx — invoked on Logout click */
  signOutAction: () => Promise<void>;
};

export function ProfileMenu({ name, login, signOutAction }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  const initial = (name || login || "?").slice(0, 1).toUpperCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("nav.profileMenu")}
        aria-expanded={open}
        className="profile-avatar inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition active:scale-[0.94]"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 95%, white 5%), var(--accent))",
          color: "var(--btn-fill-fg)",
          boxShadow: open
            ? "0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent), 0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent)"
            : "0 2px 6px color-mix(in srgb, var(--accent) 30%, transparent)",
        }}
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          className="profile-menu-popup absolute right-0 top-full z-50 mt-2 w-[260px] rounded-2xl border p-2 shadow-2xl"
          style={{
            backgroundColor: "var(--bg-panel)",
            borderColor: "var(--border)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.20)",
          }}
        >
          {/* User info */}
          <div className="flex items-center gap-3 px-2 pb-2.5 pt-1.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 95%, white 5%), var(--accent))",
                color: "var(--btn-fill-fg)",
              }}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold" style={{ color: "var(--text)" }}>
                {name}
              </p>
              <p className="truncate font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
                {login}
              </p>
            </div>
          </div>

          <div className="h-px" style={{ backgroundColor: "var(--border)" }} />

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="profile-menu-item flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition"
            style={{ color: "var(--text)" }}
          >
            <UserRound className="h-4 w-4" style={{ color: "var(--accent)" }} />
            {t("nav.profile")}
          </Link>
          <Link
            href="/profile#password"
            onClick={() => setOpen(false)}
            className="profile-menu-item flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition"
            style={{ color: "var(--text)" }}
          >
            <KeyRound className="h-4 w-4" style={{ color: "#DC2626" }} />
            {t("nav.changePassword")}
          </Link>
          <Link
            href="/profile#support"
            onClick={() => setOpen(false)}
            className="profile-menu-item flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition"
            style={{ color: "var(--text)" }}
          >
            <LifeBuoy className="h-4 w-4" style={{ color: "#7C3AED" }} />
            {t("nav.support")}
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="profile-menu-item flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition"
            style={{ color: "var(--text)" }}
          >
            <Settings className="h-4 w-4" style={{ color: "var(--text-faint)" }} />
            {t("nav.dashboard")}
          </Link>

          <div className="my-1 h-px" style={{ backgroundColor: "var(--border)" }} />

          <form
            action={async () => {
              await signOutAction();
            }}
          >
            <button
              type="submit"
              className="profile-menu-item flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition"
              style={{ color: "#dc2626" }}
            >
              <LogOut className="h-4 w-4" />
              {t("nav.signOut")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
