"use client";

import { useState } from "react";
import { Server, Sparkles, KeyRound, Send } from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import { llmModelPresets } from "@/lib/dropdowns";
import { useTranslation } from "@/lib/i18n/provider";

type Tab = "own" | "managed";

/**
 * LLM-section in onboarding form: 2-tab UI
 *  - Own API: fields for base URL, model, key (saved with workspace via main action)
 *  - Managed: just a note + "request via service bot" — sets a hidden flag in form
 */
export function LlmSection() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("own");

  return (
    <fieldset
      className="liquid-card mt-7 rounded-2xl p-5"
      style={{ border: "0.5px solid var(--border)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4" style={{ color: "#7C3AED" }} />
          <legend
            className="text-xs font-bold uppercase tracking-[0.14em]"
            style={{ color: "#7C3AED" }}
          >
            {t("onboarding.llmLegend")}
          </legend>
        </div>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--text-faint)" }}
        >
          {t("onboarding.llmCanSkip")}
        </span>
      </div>

      <div
        className="relative mt-3 inline-flex items-center rounded-full"
        role="tablist"
        style={{
          padding: "3px",
          backgroundColor: "color-mix(in srgb, var(--bg-muted) 80%, transparent)",
          border: "0.5px solid var(--border)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            top: 4,
            bottom: 4,
            left: tab === "own" ? "4px" : "calc(50% + 1px)",
            width: "calc(50% - 5px)",
            backgroundColor: "var(--bg-panel)",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)",
            transition: "left 0.42s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        />
        {(["own", "managed"] as Tab[]).map((tabKey) => {
          const active = tabKey === tab;
          return (
            <button
              key={tabKey}
              type="button"
              role="tab"
              onClick={() => setTab(tabKey)}
              className="relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold transition"
              style={{
                color: active ? "#7C3AED" : "var(--text-muted)",
                minWidth: 140,
              }}
            >
              {tabKey === "own" ? (
                <KeyRound className="h-3 w-3" strokeWidth={active ? 2.4 : 2} />
              ) : (
                <Sparkles className="h-3 w-3" strokeWidth={active ? 2.4 : 2} />
              )}
              {tabKey === "own" ? t("onboarding.llmTabOwnShort") : t("onboarding.llmTabManagedShort")}
            </button>
          );
        })}
      </div>

      <input type="hidden" name="llmTab" value={tab} />

      {tab === "own" ? (
        <div className="mt-5 space-y-3">
          <p className="text-xs leading-5" style={{ color: "var(--text-muted)" }}>
            {t("onboarding.llmOwnPrompt")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              <span className="flex items-center justify-between">
                {t("onboarding.llmModelOrProvider")}
                <HelpTip
                  title={t("onboarding.llmHelpTitle")}
                  steps={[
                    t("onboarding.llmHelpStep1"),
                    t("onboarding.llmHelpStep2"),
                    t("onboarding.llmHelpStep3"),
                    t("onboarding.llmHelpStep4"),
                  ]}
                  link={{
                    href: "https://platform.openai.com/api-keys",
                    label: t("onboarding.llmHelpLink"),
                  }}
                />
              </span>
              <select
                name="llmModel"
                defaultValue=""
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-[#7C3AED]"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text)",
                }}
              >
                <option value="">{t("onboarding.llmSkipNow")}</option>
                {llmModelPresets.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("onboarding.llmBaseUrlLabel")}
              <input
                name="llmBaseUrl"
                placeholder="https://api.openai.com/v1"
                className="mt-2 w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none focus:border-[#7C3AED]"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text)",
                }}
              />
            </label>
          </div>

          <label
            className="block text-sm font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="flex items-center justify-between">
              {t("onboarding.llmApiKeyLabel")}
              <HelpTip
                title="API key"
                steps={[
                  t("onboarding.llmApiKeyHelpStep1"),
                  t("onboarding.llmApiKeyHelpStep2"),
                  t("onboarding.llmApiKeyHelpStep3"),
                  t("onboarding.llmApiKeyHelpStep4"),
                ]}
              />
            </span>
            <input
              name="llmKey"
              type="password"
              placeholder="sk-..."
              className="mt-2 w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none focus:border-[#7C3AED]"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text)",
              }}
            />
          </label>
        </div>
      ) : (
        <div className="mt-5">
          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: "rgba(124,58,237,0.3)",
              background: "color-mix(in srgb, #7C3AED 6%, var(--bg-panel))",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #c084fc 100%)",
                }}
              >
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4
                  className="text-base font-bold tracking-[-0.02em]"
                  style={{ color: "var(--text)" }}
                >
                  {t("onboarding.llmManagedHeading")}
                </h4>
                <p
                  className="mt-1 text-xs leading-5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t("onboarding.llmManagedBody")}
                </p>
              </div>
            </div>

            <label
              className="mt-4 block text-xs font-bold uppercase tracking-[0.1em]"
              style={{ color: "var(--text-faint)" }}
            >
              {t("onboarding.llmManagedQuestion")}
              <textarea
                name="managedAiNote"
                rows={3}
                placeholder={t("onboarding.llmManagedPlaceholder")}
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm leading-relaxed outline-none focus:border-[#7C3AED]"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text)",
                  fontFamily: "inherit",
                  textTransform: "none",
                  letterSpacing: "0",
                }}
              />
            </label>

            <input type="hidden" name="requestManagedAi" value="true" />

            <div
              className="mt-4 rounded-xl border-l-4 p-3 text-xs leading-5"
              style={{
                borderColor: "#7C3AED",
                background: "color-mix(in srgb, #7C3AED 12%, transparent)",
                color: "var(--text-secondary)",
              }}
            >
              <strong style={{ color: "#7C3AED" }}>{t("onboarding.llmManagedFlowStrong")}</strong>{" "}
              {t("onboarding.llmManagedFlowText")}
            </div>

            <div
              className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #c084fc 100%)",
                color: "#ffffff",
              }}
            >
              <Send className="h-3 w-3" />
              {t("onboarding.llmManagedAutoSend")}
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
}
