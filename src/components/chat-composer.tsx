"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Video,
  Sparkles,
  X,
  Square,
  Play,
  Pause,
} from "lucide-react";
import { sendReply } from "@/app/actions";
import { useTranslation } from "@/lib/i18n/provider";

type Props = {
  tenantSlug: string;
  conversationId: string;
  providerLabel: string;
  aiSuggestion: string;
};

type Attachment = { kind: string; name: string; size?: string };
type Voice = { url: string; blob: Blob; durationSec: number; sizeBytes: number };

export function ChatComposer({
  tenantSlug,
  conversationId,
  providerLabel,
  aiSuggestion,
}: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pending, startTransition] = useTransition();

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const [voice, setVoice] = useState<Voice | null>(null);
  const [voicePlaying, setVoicePlaying] = useState(false);

  const fileRef  = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recStartRef = useRef<number>(0);
  const recIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recIntervalRef.current) clearInterval(recIntervalRef.current);
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (voice?.url) URL.revokeObjectURL(voice.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickFiles(ref: React.RefObject<HTMLInputElement | null>) {
    return () => ref.current?.click();
  }

  function onPicked(kind: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const list: Attachment[] = Array.from(files).map((f) => ({
        kind,
        name: f.name,
        size: formatSize(f.size),
      }));
      setAttachments((prev) => [...prev, ...list]);
      e.target.value = "";
    };
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Voice recording ──
  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert(t("composer.micUnsupported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        const dur = Math.max(
          1,
          Math.round((Date.now() - recStartRef.current) / 1000),
        );
        if (voice?.url) URL.revokeObjectURL(voice.url);
        setVoice({ url, blob, durationSec: dur, sizeBytes: blob.size });
        stream.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      recStartRef.current = Date.now();
      setRecDuration(0);
      setIsRecording(true);
      recIntervalRef.current = setInterval(() => {
        setRecDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert(t("composer.micDenied"));
    }
  }

  function stopRecording() {
    if (recIntervalRef.current) {
      clearInterval(recIntervalRef.current);
      recIntervalRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function cancelRecording() {
    if (recIntervalRef.current) {
      clearInterval(recIntervalRef.current);
      recIntervalRef.current = null;
    }
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecDuration(0);
  }

  function discardVoice() {
    if (voice?.url) URL.revokeObjectURL(voice.url);
    setVoice(null);
    setVoicePlaying(false);
  }

  function toggleVoicePlay() {
    if (!audioRef.current) return;
    if (voicePlaying) {
      audioRef.current.pause();
      setVoicePlaying(false);
    } else {
      audioRef.current.play();
      setVoicePlaying(true);
    }
  }

  // ── Voice → base64 data URL ──
  // We can't write to the FS on Vercel serverless (ephemeral, read-only),
  // so we encode the blob to base64 and embed it directly in the message
  // metadata. The <audio> element plays data: URLs natively. Trade-off:
  // ~30 KB of base64 per second of speech; fine for short voice messages.
  async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error ?? new Error("read failed"));
      fr.readAsDataURL(blob);
    });
  }

  function buildMessage(content: string, voiceUrl?: string) {
    const lines: string[] = [];
    if (voice) {
      const tag = voiceUrl
        ? t("composer.voiceTag", { dur: formatDuration(voice.durationSec) })
        : t("composer.voiceTagFailed", { dur: formatDuration(voice.durationSec) });
      lines.push(tag);
    }
    if (attachments.length > 0) {
      attachments.forEach((a) => {
        lines.push(
          `[${a.kind}: ${a.name}${a.size ? `, ${a.size}` : ""}]`,
        );
      });
    }
    if (content.trim()) lines.push(content.trim());
    return lines.join("\n");
  }

  function send(content: string) {
    if (!content.trim() && !voice && attachments.length === 0) return;

    startTransition(async () => {
      try {
        // Encode voice (if any) inline as a data URL — survives across deploys
        // and works without filesystem writes on Vercel.
        let voicePayload: { url: string; durationSec: number; sizeBytes: number } | null = null;
        if (voice) {
          try {
            const dataUrl = await blobToDataUrl(voice.blob);
            voicePayload = {
              url: dataUrl,
              durationSec: voice.durationSec,
              sizeBytes: voice.sizeBytes,
            };
          } catch (e) {
            console.error("voice encode failed:", e);
          }
        }

        const finalText = buildMessage(content, voicePayload?.url);
        if (!finalText) return;

        const metadata = voicePayload || attachments.length > 0
          ? { voice: voicePayload, files: attachments }
          : null;

        const fd = new FormData();
        fd.set("tenantSlug", tenantSlug);
        fd.set("conversationId", conversationId);
        fd.set("content", finalText);
        if (metadata) fd.set("attachmentsJson", JSON.stringify(metadata));

        await sendReply(fd);
        setText("");
        setAttachments([]);
        discardVoice();
        textareaRef.current?.focus();
      } catch (e) {
        console.error(e);
      }
    });
  }

  // Enter to send (Shift+Enter for newline)
  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (!pending) send(text);
    }
  }

  const [aiOpen, setAiOpen] = useState(false);
  const hasContent = text.trim().length > 0 || !!voice || attachments.length > 0;

  return (
    <div className="relative">
      {/* Hidden file inputs */}
      <input ref={fileRef}  type="file" multiple                  hidden onChange={onPicked(t("composer.fileKind"))} />
      <input ref={photoRef} type="file" multiple accept="image/*" hidden onChange={onPicked(t("composer.photoKind"))} />
      <input ref={videoRef} type="file" multiple accept="video/*" hidden onChange={onPicked(t("composer.videoKind"))} />

      {/* ── AI suggestion — collapsible chip floating above composer ── */}
      {aiSuggestion ? (
        <div className="mb-2.5">
          {!aiOpen ? (
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="hover-grow inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition active:scale-[0.96]"
              style={{
                color: "#7C3AED",
                backgroundColor: "color-mix(in srgb, #7C3AED 12%, var(--bg-panel))",
                border: "1px solid color-mix(in srgb, #7C3AED 28%, transparent)",
              }}
            >
              <Sparkles className="h-3 w-3" />
              {t("composer.aiSuggestChip")}
            </button>
          ) : (
            <div
              className="ai-suggestion-card flex items-start gap-3 rounded-2xl border p-3"
              style={{
                borderColor: "color-mix(in srgb, #7C3AED 28%, transparent)",
                backgroundColor: "color-mix(in srgb, #7C3AED 6%, var(--bg-panel))",
              }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: "color-mix(in srgb, #7C3AED 18%, transparent)" }}
              >
                <Sparkles className="h-3.5 w-3.5" style={{ color: "#7C3AED" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#7C3AED" }}>
                    {t("composer.aiSuggests")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAiOpen(false)}
                    aria-label={t("composer.aiHide")}
                    className="h-5 w-5 rounded-full transition hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: "var(--text-faint)" }}
                  >
                    <X className="m-auto h-3 w-3" />
                  </button>
                </div>
                <p className="mt-1 text-[13px] leading-snug" style={{ color: "var(--text)" }}>
                  {aiSuggestion}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setText(aiSuggestion);
                      setAiOpen(false);
                      textareaRef.current?.focus();
                    }}
                    className="hover-grow inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition active:scale-[0.96]"
                    style={{
                      color: "#7C3AED",
                      backgroundColor: "color-mix(in srgb, #7C3AED 12%, transparent)",
                    }}
                  >
                    {t("composer.aiInsertField")}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => { send(aiSuggestion); setAiOpen(false); }}
                    className="hover-grow inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-white transition active:scale-[0.96]"
                    style={{ backgroundColor: "#7C3AED" }}
                  >
                    <Send className="h-3 w-3" />
                    {t("composer.aiSendAsIs")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ── Recording overlay (replaces composer while recording) ── */}
      {isRecording ? (
        <div
          className="flex items-center gap-3 rounded-full border px-4 py-2.5"
          style={{
            borderColor: "rgba(220,38,38,0.35)",
            backgroundColor: "color-mix(in srgb, #dc2626 8%, var(--bg-soft))",
          }}
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />
            <span className="relative h-3 w-3 rounded-full bg-red-500" />
          </span>
          <p className="text-sm font-bold" style={{ color: "#dc2626" }}>
            {t("composer.recording", { dur: formatDuration(recDuration) })}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="hover-grow inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-[0.96]"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              <X className="h-3.5 w-3.5" /> {t("composer.cancel")}
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="hover-grow inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-white transition active:scale-[0.96]"
              style={{ backgroundColor: "#dc2626" }}
            >
              <Square className="h-3.5 w-3.5" /> {t("composer.stop")}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Voice preview chip */}
          {voice ? (
            <div
              className="mb-2 inline-flex items-center gap-2.5 rounded-full border px-2 py-1.5"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}
            >
              <button
                type="button"
                onClick={toggleVoicePlay}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white transition active:scale-[0.94]"
                style={{ backgroundColor: "var(--accent)" }}
                aria-label={voicePlaying ? t("composer.voicePause") : t("composer.voicePlay")}
              >
                {voicePlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
              <audio ref={audioRef} src={voice.url} onEnded={() => setVoicePlaying(false)} hidden />
              <span className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>
                {t("composer.voiceSummary", { dur: formatDuration(voice.durationSec), size: formatSize(voice.sizeBytes) })}
              </span>
              <button
                type="button"
                onClick={discardVoice}
                className="ml-1 rounded-full p-0.5 transition hover:bg-black/5"
                style={{ color: "var(--text-faint)" }}
                aria-label={t("composer.removeChip")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          {/* Attachment chips */}
          {attachments.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    color: "var(--accent)",
                    backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                  }}
                >
                  {a.kind} {a.name}
                  {a.size ? ` · ${a.size}` : ""}
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="hover:opacity-70"
                    aria-label={t("composer.removeChip")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {/* ── Telegram-style composer pill ── */}
          <div
            className="composer-pill flex items-end gap-1 rounded-[24px] border px-2 py-1.5"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--bg-soft)",
            }}
          >
            {/* Left icons */}
            <ComposerIcon label={t("composer.fileLabel")} onClick={pickFiles(fileRef)}>
              <Paperclip className="h-4 w-4" />
            </ComposerIcon>
            <ComposerIcon label={t("composer.photoLabel")} onClick={pickFiles(photoRef)}>
              <ImageIcon className="h-4 w-4" />
            </ComposerIcon>
            <ComposerIcon label={t("composer.videoLabel")} onClick={pickFiles(videoRef)}>
              <Video className="h-4 w-4" />
            </ComposerIcon>

            {/* Auto-growing textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                const el = textareaRef.current;
                if (el) {
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 160) + "px";
                }
              }}
              onKeyDown={onKey}
              rows={1}
              placeholder={t("composer.placeholderProvider", { provider: providerLabel })}
              className="flex-1 resize-none self-center bg-transparent px-2 py-1.5 text-[14px] leading-5 outline-none"
              style={{ color: "var(--text)", maxHeight: 160 }}
            />

            {/* Right action: mic when empty, send when not */}
            {!hasContent ? (
              <button
                type="button"
                onClick={startRecording}
                className="composer-send hover-grow flex h-9 w-9 items-center justify-center rounded-full transition active:scale-[0.92]"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--btn-fill-fg)",
                  boxShadow: "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)",
                }}
                aria-label={t("composer.voiceLabel")}
                title={t("composer.voiceTooltip")}
              >
                <Mic className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => send(text)}
                className="composer-send hover-grow flex h-9 w-9 items-center justify-center rounded-full transition active:scale-[0.92] disabled:opacity-60"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--btn-fill-fg)",
                  boxShadow: "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)",
                }}
                aria-label={t("composer.sendAction")}
                title={t("composer.sendTooltip")}
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ComposerIcon({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="composer-icon flex h-9 w-9 items-center justify-center rounded-full transition active:scale-[0.92]"
      style={{ color: "var(--text-faint)" }}
    >
      {children}
    </button>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
