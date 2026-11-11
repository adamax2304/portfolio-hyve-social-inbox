import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/access-request-db";
import { getActiveManagedSetupRequest } from "@/lib/managed-setup-db";
import { getI18nBundle } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/format";
import { ProfileCabinet } from "@/components/profile-cabinet";
import { ManagedSetupCard } from "@/components/managed-setup-card";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const profile = await getUserProfile(session.user.id);
  if (!profile) redirect("/");

  if (profile.mustChangePassword) redirect("/profile/setup");

  const activeManagedSetup = await getActiveManagedSetupRequest(session.user.id).catch(
    () => null,
  );

  const { locale, messages } = await getI18nBundle();
  const t = createTranslator(messages);

  const createdStr = new Date(profile.createdAt).toLocaleDateString(locale);
  const lastLoginStr = profile.lastLoginAt
    ? new Date(profile.lastLoginAt).toLocaleDateString(locale)
    : null;

  return (
    <main className="page-enter mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="hover-grow inline-flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor: "var(--bg-panel)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
          aria-label={t("profile.backToDashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "var(--text-faint)" }}
          >
            {t("profile.title")}
          </p>
          <h1
            className="truncate text-2xl font-bold tracking-[-0.03em] sm:text-3xl"
            style={{ color: "var(--text)" }}
          >
            {profile.name}
          </h1>
        </div>
        <div
          className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold sm:flex"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent) 18%, transparent)",
            color: "var(--accent)",
          }}
          aria-hidden
        >
          {profile.name.slice(0, 1).toUpperCase() || (
            <UserRound className="h-6 w-6" />
          )}
        </div>
      </div>

      <ProfileCabinet initialProfile={profile} />

      <ManagedSetupCard
        variant="profile-card"
        alreadyRequested={!!activeManagedSetup}
        consentAt={activeManagedSetup?.consentAt ?? null}
        defaultContact={profile.recoveryEmail ?? profile.email}
        defaultBusinessName=""
      />

      <p className="mt-2 text-center text-[11px]" style={{ color: "var(--text-faint)" }}>
        {t("profile.accountCreated", { date: createdStr })}
        {lastLoginStr ? ` · ${t("profile.lastLogin", { date: lastLoginStr })}` : ""}
      </p>
    </main>
  );
}
