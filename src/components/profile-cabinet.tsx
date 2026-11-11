"use client";

import { useState, useTransition } from "react";
import {
  KeyRound,
  Mail,
  Send,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  LifeBuoy,
  UserRound,
  AtSign,
  ShieldCheck,
} from "lucide-react";
import {
  changePasswordAction,
  updateLoginAction,
  updateProfileAction,
  submitSupportAction,
} from "@/app/actions";
import { useTranslation } from "@/lib/i18n/provider";

type Profile = {
  id: string;
  name: string;
  email: string;
  recoveryEmail: string | null;
  recoveryTelegram: string | null;
  mustChangePassword: number;
  lastLoginAt: string | null;
  createdAt: string;
};

function Notice({ kind, msg }: { kind: "ok" | "err"; msg: string }) {
  return (
    <div
      className="mt-3 flex items-start gap-2 rounded-2xl px-3 py-2 text-xs font-semibold"
      style={{
        backgroundColor:
          kind === "ok"
            ? "color-mix(in srgb, #16a34a 14%, transparent)"
            : "color-mix(in srgb, #dc2626 14%, transparent)",
        color: kind === "ok" ? "#16a34a" : "#dc2626",
      }}
    >
      {kind === "ok" ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5" />
      ) : (
        <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
      )}
      <span>{msg}</span>
    </div>
  );
}

function Card({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  desc,
  children,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel rounded-[24px] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className="text-base font-bold tracking-[-0.02em]"
            style={{ color: "var(--text)" }}
          >
            {title}
          </h2>
          {desc ? (
            <p className="mt-0.5 text-xs leading-snug" style={{ color: "var(--text-muted)" }}>
              {desc}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--bg-input)",
  color: "var(--text)",
  border: "1px solid var(--border-strong)",
};

export function ProfileCabinet({ initialProfile }: { initialProfile: Profile }) {
  const { t } = useTranslation();
  // ── Login + name ──
  const [loginValue, setLoginValue] = useState(initialProfile.email);
  const [nameValue, setNameValue] = useState(initialProfile.name);
  const [profileMsg, setProfileMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [profilePending, profileTransition] = useTransition();

  // ── Password ──
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [pwdPending, pwdTransition] = useTransition();

  // ── Recovery ──
  const [recEmail, setRecEmail] = useState(initialProfile.recoveryEmail ?? "");
  const [recTg, setRecTg] = useState(initialProfile.recoveryTelegram ?? "");
  const [recMsg, setRecMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [recPending, recTransition] = useTransition();

  // ── Support ──
  const [subject, setSubject] = useState("");
  const [supportMsg, setSupportMsg] = useState("");
  const [supportNotice, setSupportNotice] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [supportPending, supportTransition] = useTransition();

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    profileTransition(async () => {
      try {
        const fd1 = new FormData();
        fd1.set("name", nameValue);
        const r1 = await updateProfileAction(fd1);
        if (!r1.ok) {
          setProfileMsg({ kind: "err", msg: r1.error ?? t("profile.errorGeneric") });
          return;
        }
        if (loginValue.toLowerCase() !== initialProfile.email.toLowerCase()) {
          const fd2 = new FormData();
          fd2.set("newLogin", loginValue);
          const r2 = await updateLoginAction(fd2);
          if (!r2.ok) {
            setProfileMsg({ kind: "err", msg: r2.error ?? t("profile.errorGeneric") });
            return;
          }
        }
        setProfileMsg({ kind: "ok", msg: t("profile.saved") });
      } catch (err) {
        console.error(err);
        setProfileMsg({ kind: "err", msg: t("profile.errorNetwork") });
      }
    });
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    pwdTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("oldPassword", oldPwd);
        fd.set("newPassword", newPwd);
        const r = await changePasswordAction(fd);
        if (!r.ok) {
          setPwdMsg({ kind: "err", msg: r.error ?? t("profile.errorGeneric") });
          return;
        }
        setOldPwd("");
        setNewPwd("");
        setPwdMsg({ kind: "ok", msg: t("profile.passwordChanged") });
      } catch (err) {
        console.error(err);
        setPwdMsg({ kind: "err", msg: t("profile.errorNetwork") });
      }
    });
  }

  function saveRecovery(e: React.FormEvent) {
    e.preventDefault();
    setRecMsg(null);
    recTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("recoveryEmail", recEmail);
        fd.set("recoveryTelegram", recTg);
        const r = await updateProfileAction(fd);
        if (!r.ok) {
          setRecMsg({ kind: "err", msg: r.error ?? t("profile.errorGeneric") });
          return;
        }
        setRecMsg({ kind: "ok", msg: t("profile.recoverySaved") });
      } catch (err) {
        console.error(err);
        setRecMsg({ kind: "err", msg: t("profile.errorNetwork") });
      }
    });
  }

  function sendSupport(e: React.FormEvent) {
    e.preventDefault();
    setSupportNotice(null);
    supportTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("subject", subject);
        fd.set("message", supportMsg);
        const r = await submitSupportAction(fd);
        if (!r.ok) {
          setSupportNotice({ kind: "err", msg: r.error ?? t("profile.errorGeneric") });
          return;
        }
        setSubject("");
        setSupportMsg("");
        setSupportNotice({
          kind: "ok",
          msg: t("profile.supportSent"),
        });
      } catch (err) {
        console.error(err);
        setSupportNotice({ kind: "err", msg: t("profile.errorNetwork") });
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ─── Профиль ─── */}
      <Card
        icon={UserRound}
        iconBg="color-mix(in srgb, var(--accent) 14%, transparent)"
        iconColor="var(--accent)"
        title={t("profile.cardProfileTitle")}
        desc={t("profile.cardProfileDesc")}
      >
        <form onSubmit={saveProfile} className="space-y-3">
          <label
            className="block text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("profile.nameLabel")}
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              maxLength={100}
              className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
              style={inputStyle}
            />
          </label>
          <label
            className="block text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("profile.loginLabel")}
            <input
              type="text"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              minLength={3}
              maxLength={50}
              className="mt-1.5 w-full rounded-2xl px-4 py-2.5 font-mono text-sm outline-none transition focus:border-[var(--accent)]"
              style={inputStyle}
            />
            <p className="mt-1 text-[10px]" style={{ color: "var(--text-faint)" }}>
              {t("profile.loginHint")}
            </p>
          </label>
          <button
            type="submit"
            disabled={profilePending}
            className="hover-grow inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition active:scale-[0.97] disabled:opacity-60"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--btn-fill-fg)",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)",
            }}
          >
            <Save className="h-3.5 w-3.5" />
            {profilePending ? t("profile.saving") : t("profile.saveButton")}
          </button>
          {profileMsg ? <Notice {...profileMsg} /> : null}
        </form>
      </Card>

      {/* ─── Пароль ─── */}
      <Card
        icon={KeyRound}
        iconBg="color-mix(in srgb, #DC2626 14%, transparent)"
        iconColor="#DC2626"
        title={t("profile.cardPasswordTitle")}
        desc={t("profile.cardPasswordDesc")}
      >
        <form onSubmit={savePassword} className="space-y-3">
          <label
            className="block text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("profile.currentPasswordLabel")}
            <div className="relative mt-1.5">
              <input
                type={showOld ? "text" : "password"}
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-[var(--accent)]"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowOld((v) => !v)}
                aria-label={showOld ? t("profile.hidePassword") : t("profile.showPassword")}
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-black/5"
                style={{ color: "var(--text-faint)" }}
              >
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <label
            className="block text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("profile.newPasswordLabel")}
            <div className="relative mt-1.5">
              <input
                type={showNew ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                minLength={6}
                maxLength={30}
                placeholder={t("profile.newPasswordPlaceholder")}
                className="w-full rounded-2xl px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-[var(--accent)]"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? t("profile.hidePassword") : t("profile.showPassword")}
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-black/5"
                style={{ color: "var(--text-faint)" }}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[10px]" style={{ color: "var(--text-faint)" }}>
              {newPwd.length === 0
                ? t("profile.passwordLengthHint")
                : newPwd.length >= 6
                ? t("profile.passwordLengthCounter", { len: newPwd.length })
                : t("profile.passwordLengthMin", { len: newPwd.length })}
            </p>
          </label>
          <button
            type="submit"
            disabled={pwdPending}
            className="hover-grow inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition active:scale-[0.97] disabled:opacity-60"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--btn-fill-fg)",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)",
            }}
          >
            <KeyRound className="h-3.5 w-3.5" />
            {pwdPending ? t("profile.changingPassword") : t("profile.changePasswordButton")}
          </button>
          {pwdMsg ? <Notice {...pwdMsg} /> : null}
        </form>
      </Card>

      {/* ─── Recovery ─── */}
      <Card
        icon={ShieldCheck}
        iconBg="color-mix(in srgb, #059669 14%, transparent)"
        iconColor="#059669"
        title={t("profile.cardRecoveryTitle")}
        desc={t("profile.cardRecoveryDesc")}
      >
        <form onSubmit={saveRecovery} className="space-y-3">
          <label
            className="block text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {t("profile.recoveryEmailLabel")}
            </span>
            <input
              type="email"
              value={recEmail}
              onChange={(e) => setRecEmail(e.target.value)}
              placeholder={t("profile.recoveryEmailPlaceholder")}
              className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
              style={inputStyle}
            />
          </label>
          <label
            className="block text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="inline-flex items-center gap-1">
              <AtSign className="h-3 w-3" /> {t("profile.recoveryTelegramLabel")}
            </span>
            <input
              type="text"
              value={recTg}
              onChange={(e) => setRecTg(e.target.value)}
              placeholder={t("profile.recoveryTelegramPlaceholder")}
              className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
              style={inputStyle}
            />
          </label>
          <button
            type="submit"
            disabled={recPending}
            className="hover-grow inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition active:scale-[0.97] disabled:opacity-60"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--btn-fill-fg)",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)",
            }}
          >
            <Save className="h-3.5 w-3.5" />
            {recPending ? t("profile.saving") : t("profile.recoverySave")}
          </button>
          {recMsg ? <Notice {...recMsg} /> : null}
        </form>
      </Card>

      {/* ─── Support ─── */}
      <Card
        icon={LifeBuoy}
        iconBg="color-mix(in srgb, #7C3AED 14%, transparent)"
        iconColor="#7C3AED"
        title={t("profile.cardSupportTitle")}
        desc={t("profile.cardSupportDesc")}
      >
        <form onSubmit={sendSupport} className="space-y-3">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("profile.supportSubjectPlaceholder")}
            className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
            style={inputStyle}
          />
          <textarea
            value={supportMsg}
            onChange={(e) => setSupportMsg(e.target.value)}
            rows={4}
            placeholder={t("profile.supportMessagePlaceholder")}
            maxLength={5000}
            className="w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
            style={inputStyle}
          />
          <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>
            {t("profile.supportCounter", { count: supportMsg.length })}
          </p>
          <button
            type="submit"
            disabled={supportPending || !supportMsg.trim()}
            className="hover-grow inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition active:scale-[0.97] disabled:opacity-60"
            style={{
              backgroundColor: "#7C3AED",
              color: "#ffffff",
              boxShadow: "0 2px 8px rgba(124,58,237,0.4)",
            }}
          >
            <Send className="h-3.5 w-3.5" />
            {supportPending ? t("profile.supportSending") : t("profile.supportSubmit")}
          </button>
          {supportNotice ? <Notice {...supportNotice} /> : null}
        </form>
      </Card>
    </div>
  );
}
