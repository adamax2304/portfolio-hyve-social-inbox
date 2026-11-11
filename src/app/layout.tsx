import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import "./globals.css";
import { auth, signOut } from "@/auth";
import { getCurrentTheme } from "@/lib/theme";
import { isPlatformOwner } from "@/lib/admin";
import { getI18nBundle } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MouseGlow } from "@/components/mouse-glow";
import { LiquidSpotlight } from "@/components/liquid-spotlight";
import { ProfileMenu } from "@/components/profile-menu";

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic", "latin-ext"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic", "latin-ext"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Hyve",
  description:
    "Hyve — B2B omnichannel inbox for Instagram, WhatsApp, Telegram, and Messenger sales workflows.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, theme, i18n, reqHeaders] = await Promise.all([
    auth(),
    getCurrentTheme(),
    getI18nBundle(),
    headers(),
  ]);
  const pathname = reqHeaders.get("x-pathname") ?? "/";

  return (
    <html
      lang={i18n.locale}
      data-theme={theme}
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={i18n.locale} messages={i18n.messages}>
          <MouseGlow />
          <LiquidSpotlight />
          {session ? (
            <header
              className="glass sticky top-0 z-50"
              style={{
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
              }}
            >
              <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <Link
                  href="/dashboard"
                  className="header-brand text-sm font-bold tracking-[-0.02em]"
                  style={{ color: "var(--text)" }}
                >
                  Hyve
                </Link>
                <div className="flex items-center gap-2 sm:gap-3">
                  {isPlatformOwner(session.user.email) ? (
                    <Link
                      href="/admin"
                      className="header-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--bg-panel)",
                        color: "var(--text-secondary)",
                      }}
                      title={i18n.messages.nav.adminTitle}
                    >
                      <ShieldCheck
                        className="h-3.5 w-3.5"
                        style={{ color: "var(--accent)" }}
                      />
                      <span className="hidden sm:inline">
                        {i18n.messages.nav.admin}
                      </span>
                    </Link>
                  ) : null}
                  <LanguageSwitcher locale={i18n.locale} />
                  <ThemeSwitcher current={theme} />
                  <ProfileMenu
                    name={session.user.name ?? session.user.email ?? "User"}
                    login={session.user.email ?? ""}
                    signOutAction={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  />
                </div>
              </div>
            </header>
          ) : pathname !== "/" ? (
            // Other public pages (onboarding, reset, etc.) get floating
            // controls. The landing page renders its own inline switchers.
            <div className="pointer-events-none fixed right-3 top-3 z-[60] flex items-center gap-2 sm:right-4 sm:top-4">
              <div className="pointer-events-auto flex items-center gap-2">
                <LanguageSwitcher locale={i18n.locale} />
                <ThemeSwitcher current={theme} />
              </div>
            </div>
          ) : null}
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
