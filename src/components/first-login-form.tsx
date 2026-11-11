"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  AtSign,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  changePasswordAction,
  updateProfileAction,
  updateLoginAction,
} from "@/app/actions";
import { useTranslation } from "@/lib/i18n/provider";

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--bg-input)",
  color: "var(--text)",
  border: "1px solid var(--border-strong)",
};

export function FirstLoginForm({ currentLogin }: { currentLogin: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<"password" | "recovery" | "done">("password");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [newLogin, setNewLogin] = useState(currentLogin);
  const [newPwd, setNewPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [recEmail, setRecEmail] = useState("");
  const [recTg, setRecTg] = useState("");

  function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPwd.length < 6 || newPwd.length > 30) {
      setError(t("firstLogin.errorPasswordLength"));
      return;
    }
    startTransition(async () => {
      try {
        const fdPwd = new FormData();
        fdPwd.set("newPassword", newPwd);
        fdPwd.set("firstLogin", "1");
        const r1 = await changePasswordAction(fdPwd);
        if (!r1.ok) {
          setError(r1.error ?? t("firstLogin.errorPasswordFailed"));
          return;
        }

        const trimmed = newLogin.trim().toLowerCase();
        if (trimmed && trimmed !== currentLogin.toLowerCase()) {
          const fdLogin = new FormData();
          fdLogin.set("newLogin", trimmed);
          const r2 = await updateLoginAction(fdLogin);
          if (!r2.ok) {
            setError(`${t("firstLogin.errorLoginPrefix")} ${r2.error ?? t("firstLogin.errorGeneric")}`);
            return;
          }
        }

        setStep("recovery");
      } catch (err) {
        console.error(err);
        setError(t("firstLogin.errorNetwork"));
      }
    });
  }

  function submitStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!recEmail.trim() && !recTg.trim()) {
      setError(t("firstLogin.errorContactRequired"));
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("recoveryEmail", recEmail);
        fd.set("recoveryTelegram", recTg);
        const r = await updateProfileAction(fd);
        if (!r.ok) {
          setError(r.error ?? t("firstLogin.errorContactFailed"));
          return;
        }
        setStep("done");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1100);
      } catch (err) {
        console.error(err);
        setError(t("firstLogin.errorNetwork"));
      }
    });
  }

  function skipRecovery() {
    setStep("done");
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 600);
  }

  const stepNum = step === "password" ? 1 : step === "recovery" ? 2 : 3;

  return (
    <div className="surface-panel rounded-[24px] p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        {[1, 2].map((n) => (
          <div key={n} className="flex items-center gap-2" style={{ flex: 1 }}>
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition"
              style={{
                backgroundColor:
                  stepNum > n
                    ? "#16a34a"
                    : stepNum === n
                    ? "var(--accent)"
                    : "var(--bg-muted)",
                color: stepNum >= n ? "#ffffff" : "var(--text-faint)",
              }}
            >
              {stepNum > n ? <CheckCircle2 className="h-4 w-4" /> : n}
            </span>
            {n < 2 ? (
              <div
                className="h-0.5 flex-1 rounded-full"
                style={{
                  backgroundColor: stepNum > n ? "#16a34a" : "var(--border)",
                  transition: "background-color 0.3s",
                }}
              />
            ) : null}
          </div>
        ))}
      </div>

      {step === "password" ? (
        <form onSubmit={submitStep1} className="space-y-4">
          <div>
            <h2
              className="text-base font-bold tracking-[-0.02em]"
              style={{ color: "var(--text)" }}
            >
              {t("firstLogin.step1Heading")}
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {t("firstLogin.step1Subtitle")}
            </p>
          </div>

          <label
            className="block text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("firstLogin.loginLabel")}
            <input
              type="text"
              value={newLogin}
              onChange={(e) => setNewLogin(e.target.value)}
              className="mt-1.5 w-full rounded-2xl px-4 py-2.5 font-mono text-sm outline-none transition focus:border-[var(--accent)]"
              style={inputStyle}
            />
            <p className="mt-1 text-[10px]" style={{ color: "var(--text-faint)" }}>
              {t("firstLogin.loginHint")}
            </p>
          </label>

          <label
            className="block text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="inline-flex items-center gap-1">
              <KeyRound className="h-3 w-3" /> {t("firstLogin.newPasswordLabel")}
            </span>
            <div className="relative mt-1.5">
              <input
                type={showPwd ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                minLength={6}
                maxLength={30}
                placeholder={t("firstLogin.newPasswordPlaceholder")}
                autoFocus
                className="w-full rounded-2xl px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-[var(--accent)]"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? t("firstLogin.hidePassword") : t("firstLogin.showPassword")}
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-black/5"
                style={{ color: "var(--text-faint)" }}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[10px]" style={{ color: "var(--text-faint)" }}>
              {newPwd.length === 0
                ? t("firstLogin.passwordHint")
                : newPwd.length >= 6
                ? t("firstLogin.passwordCounter", { len: newPwd.length })
                : t("firstLogin.passwordCounterMin", { len: newPwd.length })}
            </p>
          </label>

          {error ? (
            <div
              className="flex items-start gap-2 rounded-2xl px-3 py-2 text-xs font-semibold"
              style={{
                backgroundColor: "color-mix(in srgb, #dc2626 14%, transparent)",
                color: "#dc2626",
              }}
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="hover-grow inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition active:scale-[0.97] disabled:opacity-60"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--btn-fill-fg)",
              boxShadow: "0 2px 10px color-mix(in srgb, var(--accent) 35%, transparent)",
            }}
          >
            {pending ? t("firstLogin.saving") : t("firstLogin.nextButton")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      ) : null}

      {step === "recovery" ? (
        <form onSubmit={submitStep2} className="space-y-4">
          <div>
            <h2
              className="text-base font-bold tracking-[-0.02em]"
              style={{ color: "var(--text)" }}
            >
              {t("firstLogin.step2Heading")}
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {t("firstLogin.step2Subtitle")}
            </p>
          </div>

          <label
            className="block text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {t("firstLogin.recoveryEmailLabel")}
            </span>
            <input
              type="email"
              value={recEmail}
              onChange={(e) => setRecEmail(e.target.value)}
              placeholder={t("firstLogin.recoveryEmailPlaceholder")}
              className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
              style={inputStyle}
            />
          </label>

          <label
            className="block text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="inline-flex items-center gap-1">
              <AtSign className="h-3 w-3" /> {t("firstLogin.recoveryTelegramLabel")}
            </span>
            <input
              type="text"
              value={recTg}
              onChange={(e) => setRecTg(e.target.value)}
              placeholder={t("firstLogin.recoveryTelegramPlaceholder")}
              className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
              style={inputStyle}
            />
          </label>

          {error ? (
            <div
              className="flex items-start gap-2 rounded-2xl px-3 py-2 text-xs font-semibold"
              style={{
                backgroundColor: "color-mix(in srgb, #dc2626 14%, transparent)",
                color: "#dc2626",
              }}
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
              {error}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={skipRecovery}
              disabled={pending}
              className="hover-grow rounded-full border px-4 py-3 text-sm font-bold transition active:scale-[0.97] disabled:opacity-60"
              style={{
                borderColor: "var(--border-strong)",
                color: "var(--text-secondary)",
              }}
            >
              {t("firstLogin.skipButton")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="hover-grow inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition active:scale-[0.97] disabled:opacity-60"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--btn-fill-fg)",
                boxShadow: "0 2px 10px color-mix(in srgb, var(--accent) 35%, transparent)",
              }}
            >
              {pending ? t("firstLogin.saving") : t("firstLogin.finishButton")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      ) : null}

      {step === "done" ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              backgroundColor: "color-mix(in srgb, #16a34a 18%, transparent)",
            }}
          >
            <CheckCircle2 className="h-8 w-8" style={{ color: "#16a34a" }} />
          </div>
          <p className="mt-3 text-base font-bold" style={{ color: "var(--text)" }}>
            {t("firstLogin.doneTitle")}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {t("firstLogin.doneSubtitle")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
