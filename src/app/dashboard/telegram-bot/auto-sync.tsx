"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { syncOperatorBot } from "@/app/actions";
import { useTranslation } from "@/lib/i18n/provider";

type Props = {
  tenantSlug: string;
};

/**
 * Polls the bot for new messages every 5 seconds while the page is open.
 * Replaces the need for a public webhook on localhost. Runs only when
 * the document is visible, so it pauses when the tab is in the background.
 */
export function OperatorBotAutoSync({ tenantSlug }: Props) {
  const { t, locale } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    function tick() {
      if (document.hidden) return;
      const fd = new FormData();
      fd.set("tenantSlug", tenantSlug);
      startTransition(async () => {
        try {
          await syncOperatorBot(fd);
          setLastSync(new Date());
        } catch (e) {
          console.error("auto-sync failed:", e);
        }
      });
    }

    // Run once on mount
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [tenantSlug, enabled]);

  return (
    <div
      className="surface-panel hover-grow flex flex-wrap items-center gap-3 rounded-2xl p-3"
    >
      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--accent)" }}>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : enabled ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        {enabled ? t("tgBot.autoSyncOn") : t("tgBot.autoSyncOff")}
      </span>
      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        {pending
          ? t("tgBot.autoSyncChecking")
          : lastSync
          ? t("tgBot.autoSyncLast", { time: lastSync.toLocaleTimeString(locale) })
          : t("tgBot.autoSyncNever")}
      </span>
      <button
        type="button"
        onClick={() => setEnabled((v) => !v)}
        className="ml-auto rounded-full border px-3 py-1 text-[11px] font-bold transition hover:bg-[var(--bg-muted)]"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        {enabled ? t("tgBot.autoSyncDisable") : t("tgBot.autoSyncEnable")}
      </button>
    </div>
  );
}
