import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getTranslations } from "@/lib/i18n/server";
import { TelegramManagedSetupForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ManagedSetupRequestPage() {
  const t = await getTranslations();

  return (
    <main className="page-enter mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 self-start text-xs font-bold uppercase tracking-[0.14em] transition hover:opacity-80"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("tgSetup.backToLanding")}
      </Link>

      <header className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
          }}
        >
          <Sparkles className="h-5 w-5" style={{ color: "var(--accent)" }} />
        </span>
        <div className="min-w-0">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "var(--text-faint)" }}
          >
            {t("tgSetup.managedEyebrow")}
          </p>
          <h1
            className="mt-1 text-2xl font-bold tracking-[-0.025em] sm:text-3xl"
            style={{ color: "var(--text)" }}
          >
            {t("tgSetup.managedTitle")}
          </h1>
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("tgSetup.managedSubtitle")}
          </p>
        </div>
      </header>

      <TelegramManagedSetupForm />
    </main>
  );
}
