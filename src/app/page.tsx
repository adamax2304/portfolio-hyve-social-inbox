import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import {
  MessageSquareMore,
  Users,
  WandSparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Webhook,
  Bot,
  BarChart3,
  Lock,
} from "lucide-react";
import { auth, signIn } from "@/auth";
import { getCurrentTheme } from "@/lib/theme";
import { getI18nBundle } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/format";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AccessRequestButton } from "@/components/access-request-modal";
import { LoginModal } from "@/components/login-modal";

type Props = {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

const platformBadges = [
  { name: "Instagram", color: "#E1306C", bg: "#FEE2EE" },
  { name: "WhatsApp", color: "#128C7E", bg: "#D1FAE5" },
  { name: "Telegram", color: "#229ED9", bg: "#DBEAFE" },
  { name: "Messenger", color: "#0084FF", bg: "#EFF6FF" },
  { name: "Viber", color: "#7360F2", bg: "#EEE8FF" },
  { name: "Signal", color: "#3A76F0", bg: "#EBF2FF" },
  { name: "Web Chat", color: "#8B4A31", bg: "#FEF3C7" },
];

export default async function LandingPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const [theme, i18n] = await Promise.all([getCurrentTheme(), getI18nBundle()]);
  const { locale, messages } = i18n;
  const t = createTranslator(messages);
  const { error, callbackUrl } = await searchParams;
  const errorMessage = error
    ? error === "CredentialsSignin"
      ? t("landing.errorBadCredentials")
      : t("landing.errorGeneric")
    : null;

  // ── Feature cards (titles/badges/descs come from the dictionary) ──
  const features = [
    { icon: MessageSquareMore, accent: "#c96b49", accentBg: "#f5ede7", title: t("landing.feat1Title"), badge: t("landing.feat1Badge"), desc: t("landing.feat1Desc") },
    { icon: Users,             accent: "#229ED9", accentBg: "#EFF9FF", title: t("landing.feat2Title"), badge: t("landing.feat2Badge"), desc: t("landing.feat2Desc") },
    { icon: WandSparkles,      accent: "#7C3AED", accentBg: "#F5F3FF", title: t("landing.feat3Title"), badge: t("landing.feat3Badge"), desc: t("landing.feat3Desc") },
    { icon: ShieldCheck,       accent: "#DC2626", accentBg: "#FEF2F2", title: t("landing.feat4Title"), badge: t("landing.feat4Badge"), desc: t("landing.feat4Desc") },
    { icon: Webhook,           accent: "#0EA5E9", accentBg: "#F0F9FF", title: t("landing.feat5Title"), badge: t("landing.feat5Badge"), desc: t("landing.feat5Desc") },
    { icon: Bot,               accent: "#7C3AED", accentBg: "#F5F3FF", title: t("landing.feat6Title"), badge: t("landing.feat6Badge"), desc: t("landing.feat6Desc") },
    { icon: Zap,               accent: "#D97706", accentBg: "#FFFBEB", title: t("landing.feat7Title"), badge: t("landing.feat7Badge"), desc: t("landing.feat7Desc") },
    { icon: Zap,               accent: "#059669", accentBg: "#ECFDF5", title: t("landing.feat8Title"), badge: t("landing.feat8Badge"), desc: t("landing.feat8Desc") },
  ];

  const stats = [
    { value: "7",         label: t("landing.statsPlatforms") },
    { value: "4",         label: t("landing.statsRoles") },
    { value: "AES-256",   label: t("landing.statsEncryption") },
    { value: t("landing.statsOnboardingValue"), label: t("landing.statsOnboarding") },
    { value: "GPT-4+",    label: t("landing.statsLlm") },
  ];

  const llmBullets = [
    t("landing.llmBullet1"),
    t("landing.llmBullet2"),
    t("landing.llmBullet3"),
    t("landing.llmBullet4"),
    t("landing.llmBullet5"),
    t("landing.llmBullet6"),
  ];

  const trustBlocks = [
    { icon: Lock,      title: t("landing.trust1Title"), desc: t("landing.trust1Desc") },
    { icon: Webhook,   title: t("landing.trust2Title"), desc: t("landing.trust2Desc") },
    { icon: BarChart3, title: t("landing.trust3Title"), desc: t("landing.trust3Desc") },
  ];

  async function handleLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        redirectTo: callbackUrl ?? "/dashboard",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/?error=${err.type}`);
      }
      throw err;
    }
  }

  return (
    <div className="flex min-h-screen lg:flex-row">
      {/* ══════ Left aside (desktop only) — login form ══════ */}
      <aside id="login" className="hidden lg:flex lg:flex-col lg:justify-start lg:sticky lg:top-0 lg:h-screen lg:w-[420px] lg:shrink-0 lg:overflow-y-auto bg-[#f0ebe3] px-5 py-5 sm:px-8 sm:py-5 xl:w-[450px]">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c96b49]">
              <MessageSquareMore className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
              Hyve
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher locale={locale} />
            <ThemeSwitcher current={theme} />
          </div>
        </div>

        <div className="mt-5">
          <h2 className="text-xl font-bold tracking-[-0.03em] text-[#211a14]">
            {t("landing.loginAsideTitle")}
          </h2>
          <p className="mt-0.5 text-[13px] text-[#6b5f54]">
            {t("landing.loginAsideSubtitle")}
          </p>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form action={handleLogin} className="mt-3 space-y-2.5">
          <label className="block text-[13px] font-semibold text-[#3f342b]">
            {t("landing.loginField")}
            <input
              name="email"
              type="text"
              required
              autoComplete="username"
              placeholder={t("landing.loginFieldPlaceholder")}
              className="mt-1 w-full rounded-2xl border border-black/12 bg-white px-4 py-2.5 text-sm font-normal text-[#211a14] outline-none transition placeholder:text-[#bbb0a5] focus:border-[#c96b49]/60 focus:ring-2 focus:ring-[#c96b49]/12"
            />
          </label>
          <label className="block text-[13px] font-semibold text-[#3f342b]">
            {t("landing.passwordField")}
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder={t("landing.passwordFieldPlaceholder")}
              className="mt-1 w-full rounded-2xl border border-black/12 bg-white px-4 py-2.5 text-sm font-normal text-[#211a14] outline-none transition placeholder:text-[#bbb0a5] focus:border-[#c96b49]/60 focus:ring-2 focus:ring-[#c96b49]/12"
            />
          </label>

          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <button
              type="submit"
              className="rounded-full bg-[#c96b49] px-4 py-2.5 text-sm font-bold text-white shadow-[0_2px_8px_rgba(201,107,73,0.35)] transition hover:bg-[#b45d3f] hover:shadow-[0_4px_14px_rgba(201,107,73,0.45)] active:scale-[0.97]"
            >
              {t("landing.loginSubmit")}
            </button>
            <a
              href="/onboarding"
              className="rounded-full border-2 border-[#221c17] px-4 py-2.5 text-center text-sm font-bold text-[#221c17] transition hover:bg-[#221c17] hover:text-white active:scale-[0.97]"
            >
              {t("landing.createSubmit")}
            </a>
          </div>
        </form>

        <div className="my-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10" />
          <span className="text-[11px] font-medium text-[#9b8d80]">{t("landing.dividerOr")}</span>
          <div className="h-px flex-1 bg-black/10" />
        </div>

        <a
          href="/onboarding/telegram"
          className="flex items-center gap-2.5 rounded-2xl border border-[#229ED9]/30 bg-[#EFF9FF] px-3.5 py-2.5 transition hover:border-[#229ED9]/55 hover:bg-[#e1f3fc]"
        >
          <p
            className="flex-1 text-[12px] font-bold leading-tight text-[#1a86c0] line-clamp-2"
          >
            {t("landing.tgChipTitle")}
          </p>
          <span
            className="shrink-0 rounded-full bg-[#229ED9] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_2px_6px_rgba(34,158,217,0.3)]"
          >
            {t("landing.tgChipCta")}
          </span>
        </a>

        <a
          href="/onboarding/managed"
          className="mt-2 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 transition"
          style={{
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
          }}
        >
          <p
            className="flex-1 text-[12px] font-bold leading-tight line-clamp-2"
            style={{ color: "var(--accent)" }}
          >
            {t("tgSetup.managedTitle")}
          </p>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
            style={{
              backgroundColor: "var(--accent)",
              boxShadow:
                "0 2px 6px color-mix(in srgb, var(--accent) 30%, transparent)",
            }}
          >
            {t("tgSetup.submitButton")}
          </span>
        </a>

        <div className="mt-3">
          <AccessRequestButton />
        </div>
      </aside>

      {/* ══════ Right — content ══════ */}
      <main className="flex-1 overflow-x-hidden">
        {/* ── Hero ── */}
        <section className="flex flex-col justify-start bg-[#fdfaf6] px-5 pt-5 pb-8 sm:min-h-screen sm:justify-end sm:px-10 sm:py-14 lg:px-16">
          {/* Mobile mini-header */}
          <div className="mb-5 flex items-center justify-between gap-2 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c96b49]">
                <MessageSquareMore className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>Hyve</span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher locale={locale} />
              <ThemeSwitcher current={theme} />
              <LoginModal triggerLabel={t("landing.mobileSignIn")} />
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9b8d80] hero-cue">
            {t("landing.heroEyebrow")}
          </p>

          <h1
            className="mt-5 font-bold tracking-[-0.045em] text-[#211a14] hero-headline"
            style={{
              // mobile uses 12vw; desktop scales with viewport height too so
              // it never dominates a "square-ish" landscape window
              fontSize: "clamp(2.6rem, min(11vw, 14vh), 6.6rem)",
              lineHeight: "0.96",
            }}
          >
            <span className="block hero-line hero-line-1">{t("landing.heroLine1")}</span>
            <span className="block hero-line hero-line-2">{t("landing.heroLine2")}</span>
            <span className="block hero-line hero-line-3 text-[#c96b49]">
              {t("landing.heroLine3")}
            </span>
          </h1>

          <div className="hero-badges mt-6 flex flex-wrap gap-2">
            {platformBadges.map((p) => (
              <span
                key={p.name}
                className="rounded-full px-3 py-1.5 text-sm font-semibold"
                style={{ color: p.color, backgroundColor: p.bg }}
              >
                {p.name}
              </span>
            ))}
          </div>

          <p className="hero-subtext mt-5 max-w-xl text-sm leading-relaxed text-[#4f443b] sm:text-[0.95rem]">
            {t("landing.heroSubtext")}
          </p>

          <div className="mt-7 lg:hidden">
            <LoginModal
              triggerLabel={t("landing.heroAccessCta")}
              defaultMode="access"
              triggerClassName="inline-flex items-center gap-2 rounded-full bg-[#c96b49] px-5 py-3 text-sm font-bold text-white shadow-[0_2px_12px_rgba(201,107,73,0.38)] transition hover:bg-[#b45d3f] active:scale-[0.97]"
            />
          </div>

          <div className="hero-cue mt-6 flex items-center gap-2 text-xs text-[#b0a89e]">
            <span className="inline-block animate-bounce">↓</span>
            {t("landing.heroScrollHint")}
          </div>
        </section>

        {/* ── Stats strip ── */}
        <div className="border-y border-black/6 bg-white">
          <div className="flex flex-wrap items-center justify-around gap-3 px-5 py-4 sm:gap-4 sm:px-10">
            {stats.map((s) => (
              <div key={s.label} className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold tracking-[-0.03em] text-[#221c17]">
                  {s.value}
                </span>
                <span className="text-xs text-[#7f7265]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Feature cards ── */}
        <section className="bg-[#fdfaf6] px-5 py-10 sm:px-10 sm:py-12 lg:px-16">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#9b8d80]">
            {t("landing.featuresEyebrow")}
          </p>
          <h2 className="mb-7 text-xl font-bold tracking-[-0.03em] text-[#221c17] sm:text-2xl">
            {t("landing.featuresTitle")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="feat-card cursor-default rounded-[22px] bg-white p-5 shadow-[0_2px_16px_rgba(61,45,34,0.06)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: f.accentBg }}
                  >
                    <f.icon className="h-5 w-5" style={{ color: f.accent }} />
                  </div>
                  <span
                    className="max-w-[130px] truncate rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em]"
                    style={{ color: f.accent, backgroundColor: f.accentBg }}
                  >
                    {f.badge}
                  </span>
                </div>
                <p className="mt-4 font-bold tracking-[-0.02em] text-[#221c17]">
                  {f.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#5a4e45]">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── LLM section ── */}
        <section className="bg-[#221c17] px-5 py-10 sm:px-10 sm:py-12 lg:px-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c96b49]">
                {t("landing.llmEyebrow")}
              </p>
              <h2 className="mt-3 text-xl font-bold tracking-[-0.03em] text-white sm:text-2xl">
                {t("landing.llmTitle")}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#a09080]">
                {t("landing.llmText")}
              </p>
              <ul className="mt-5 space-y-2.5">
                {llmBullets.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-[#a09080]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#c96b49]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[24px] bg-[#2d2420] p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7a6b60]">
                {t("landing.llmModelsLabel")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "GPT-4o",
                  "GPT-4 Turbo",
                  "Claude 3.5 Sonnet",
                  "Claude 3 Opus",
                  "Llama 3.1",
                  "Mistral Large",
                  "Gemini Pro",
                  "Qwen 2.5",
                  "DeepSeek V3",
                  "Custom API",
                ].map((model) => (
                  <span
                    key={model}
                    className="rounded-full border border-[#c96b49]/30 bg-[#221c17] px-3 py-1.5 text-xs font-semibold text-[#e8ddd5]"
                  >
                    {model}
                  </span>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-[#1a1410] px-4 py-3 font-mono text-xs">
                <p className="text-[#6b5f54]">{t("landing.llmCodeComment")}</p>
                <p className="mt-2">
                  <span className="text-[#c96b49]">base_url</span>
                  {" : "}
                  <span className="text-[#86efac]">&quot;https://your-llm.api&quot;</span>
                </p>
                <p>
                  <span className="text-[#c96b49]">api_key</span>
                  {"  : "}
                  <span className="text-[#fbbf24]">vault.get(</span>
                  <span className="text-[#86efac]">&quot;llm_key&quot;</span>
                  <span className="text-[#fbbf24]">)</span>
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#221c17] px-4 py-2.5">
                <span className="h-2 w-2 rounded-full bg-[#86efac]" />
                <span className="font-mono text-xs text-[#6b8c6b]">
                  {t("landing.llmStatusReady")}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust blocks ── */}
        <section className="bg-white px-5 py-10 sm:px-10 sm:py-12 lg:px-16">
          <div className="grid gap-8 sm:grid-cols-3">
            {trustBlocks.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5ede7]">
                  <item.icon className="h-5 w-5 text-[#c96b49]" />
                </div>
                <div>
                  <p className="font-bold tracking-[-0.02em] text-[#221c17]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#5a4e45]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="bg-[#c96b49] px-5 py-12 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#f5c9b8]">
              {t("landing.finalCtaEyebrow")}
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.035em] text-white sm:text-3xl">
              {t("landing.finalCtaTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#f5d7cc]">
              {t("landing.finalCtaText")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <LoginModal
                triggerLabel={t("landing.finalCtaPrimary")}
                defaultMode="access"
                triggerClassName="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#c96b49] shadow-[0_2px_14px_rgba(0,0,0,0.18)] transition hover:bg-[#fff4f0] active:scale-[0.97]"
              />
              <LoginModal
                triggerLabel={t("landing.finalCtaSecondary")}
                defaultMode="login"
                triggerClassName="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:border-white/70 hover:bg-white/10 active:scale-[0.97]"
              />
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-black/6 bg-[#fdfaf6] px-5 py-5 sm:px-10 lg:px-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c96b49]">
                <MessageSquareMore className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-[#221c17]">
                Hyve
              </span>
            </div>
            <p className="text-xs text-[#9b8d80]">
              {t("landing.footerLine")}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
