import { redirect } from "next/navigation";
import { Sparkles, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/access-request-db";
import { FirstLoginForm } from "@/components/first-login-form";
import { getTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProfileSetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const profile = await getUserProfile(session.user.id);
  if (!profile) redirect("/");

  if (!profile.mustChangePassword) redirect("/dashboard");

  const t = await getTranslations();

  return (
    <main className="page-enter mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
        >
          <Sparkles className="h-6 w-6" style={{ color: "var(--accent)" }} />
        </span>
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "var(--text-faint)" }}
          >
            {t("firstLogin.pageWelcomeEyebrow")}
          </p>
          <h1
            className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl"
            style={{ color: "var(--text)" }}
          >
            {t("firstLogin.pageWelcomeTitle")}
          </h1>
        </div>
      </div>

      <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
        {t("firstLogin.pageIntro")}
      </p>

      <FirstLoginForm currentLogin={profile.email} />

      <div
        className="mt-2 flex items-start gap-2 rounded-2xl p-3"
        style={{ backgroundColor: "var(--bg-soft)", border: "1px solid var(--border)" }}
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#059669" }} />
        <p className="text-xs leading-snug" style={{ color: "var(--text-muted)" }}>
          {t("firstLogin.pageSecurityNote")}
        </p>
      </div>
    </main>
  );
}
