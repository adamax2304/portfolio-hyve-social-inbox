"use client";

import { useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Camera,
  Phone,
  Send,
  MessageCircle,
  Globe,
  Sparkles,
  KeyRound,
  BookOpen,
} from "lucide-react";
import { CHANNELS, LLM_PROVIDERS } from "@/lib/help-content";
import { useTranslation } from "@/lib/i18n/provider";

const ICONS: Record<string, React.ElementType> = {
  Camera, Phone, Send, MessageCircle, Globe,
};

/**
 * Right-side panel on the setup page that explains where to find each
 * channel's API token and which LLM providers are supported.
 *
 * Sections are collapsible accordions — open one at a time so the panel
 * stays compact.
 */
export function ApiInstructions() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<string | null>("TELEGRAM");

  function toggle(id: string) {
    setOpen((cur) => (cur === id ? null : id));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header card */}
      <section className="surface-panel rounded-[24px] p-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)" }}
          >
            <BookOpen className="h-5 w-5" style={{ color: "var(--accent)" }} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
              {t("setup.cheatsheetEyebrow")}
            </p>
            <h3 className="text-base font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
              {t("setup.cheatsheetTitle")}
            </h3>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
          {t("setup.cheatsheetIntro")}
        </p>
      </section>

      {/* Channels accordion */}
      <section className="surface-panel rounded-[24px] p-4">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
          {t("setup.channelsSection")}
        </p>
        <div className="space-y-1.5">
          {CHANNELS.map((ch) => {
            const Icon = ICONS[ch.iconName] ?? MessageCircle;
            const isOpen = open === ch.value;
            return (
              <div
                key={ch.value}
                className="rounded-xl"
                style={{
                  backgroundColor: isOpen ? "var(--bg-soft)" : "transparent",
                  border: isOpen ? "1px solid var(--border)" : "1px solid transparent",
                  transition: "background-color 0.2s, border-color 0.2s",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(ch.value)}
                  className="instr-row flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: ch.bg }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: ch.color }} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-bold leading-tight" style={{ color: "var(--text)" }}>
                      {ch.name}
                    </span>
                    <span className="block text-[10px]" style={{ color: "var(--text-faint)" }}>
                      {ch.authMode}
                    </span>
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 transition-transform"
                    style={{
                      color: "var(--text-faint)",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                    }}
                  />
                </button>

                {isOpen ? (
                  <div className="px-3 pb-3 pt-0">
                    <p className="text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                      {ch.description}
                    </p>
                    <ol className="mt-2.5 space-y-1.5">
                      {ch.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-5">
                          <span
                            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                            style={{ backgroundColor: ch.bg, color: ch.color }}
                          >
                            {i + 1}
                          </span>
                          <span style={{ color: "var(--text-secondary)" }}>{step}</span>
                        </li>
                      ))}
                    </ol>
                    {ch.link ? (
                      <a
                        href={ch.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition active:scale-[0.96]"
                        style={{
                          borderColor: ch.color,
                          color: ch.color,
                          backgroundColor: ch.bg,
                        }}
                      >
                        {ch.link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* LLM accordion */}
      <section className="surface-panel rounded-[24px] p-4">
        <div className="flex items-center gap-2 px-2 pb-2">
          <Sparkles className="h-3 w-3" style={{ color: "#7C3AED" }} />
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
            {t("setup.llmSection")}
          </p>
        </div>
        <div className="space-y-1.5">
          {LLM_PROVIDERS.map((llm) => {
            const id = `LLM:${llm.name}`;
            const isOpen = open === id;
            return (
              <div
                key={llm.name}
                className="rounded-xl"
                style={{
                  backgroundColor: isOpen ? "var(--bg-soft)" : "transparent",
                  border: isOpen ? "1px solid var(--border)" : "1px solid transparent",
                  transition: "background-color 0.2s, border-color 0.2s",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="instr-row flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: llm.bg }}
                  >
                    <KeyRound className="h-3.5 w-3.5" style={{ color: llm.color }} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-bold leading-tight" style={{ color: "var(--text)" }}>
                      {llm.name}
                    </span>
                    <span className="block truncate font-mono text-[10px]" style={{ color: "var(--text-faint)" }}>
                      {llm.baseUrl}
                    </span>
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 transition-transform"
                    style={{
                      color: "var(--text-faint)",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                    }}
                  />
                </button>

                {isOpen ? (
                  <div className="px-3 pb-3 pt-0">
                    <p className="text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                      {llm.description}
                    </p>
                    <ol className="mt-2.5 space-y-1.5">
                      {llm.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-5">
                          <span
                            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                            style={{ backgroundColor: llm.bg, color: llm.color }}
                          >
                            {i + 1}
                          </span>
                          <span style={{ color: "var(--text-secondary)" }}>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <a
                      href={llm.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition active:scale-[0.96]"
                      style={{
                        borderColor: llm.color,
                        color: llm.color,
                        backgroundColor: llm.bg,
                      }}
                    >
                      {llm.link.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
