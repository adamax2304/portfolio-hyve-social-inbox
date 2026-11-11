import { KeyRound } from "lucide-react";
import { findPasswordResetDirect } from "@/lib/access-request-db";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { getTranslations } from "@/lib/i18n/server";

type Props = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params;
  const reset = await findPasswordResetDirect(token);
  const t = await getTranslations();

  const expired =
    !reset ||
    reset.used === 1 ||
    new Date(reset.expiresAt).getTime() < Date.now();

  return (
    <main className="page-enter mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
        >
          <KeyRound className="h-5 w-5" style={{ color: "var(--accent)" }} />
        </span>
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "var(--text-faint)" }}
          >
            {t("firstLogin.resetEyebrow")}
          </p>
          <h1
            className="text-xl font-bold tracking-[-0.03em] sm:text-2xl"
            style={{ color: "var(--text)" }}
          >
            {t("firstLogin.resetTitle")}
          </h1>
        </div>
      </div>

      {expired ? (
        <div
          className="rounded-2xl border p-5 text-sm"
          style={{
            borderColor: "color-mix(in srgb, #dc2626 30%, transparent)",
            backgroundColor: "color-mix(in srgb, #dc2626 8%, var(--bg-panel))",
            color: "#dc2626",
          }}
        >
          <p className="font-bold">{t("firstLogin.resetInvalidTitle")}</p>
          <p className="mt-1 text-xs opacity-90">
            {t("firstLogin.resetInvalidText")}
          </p>
        </div>
      ) : (
        <ResetPasswordForm token={token} />
      )}
    </main>
  );
}
