"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type Props = {
  url: string;
  durationSec: number;
  /** Visual variant: matches outbound (dark bg → light controls) or inbound (light bg → dark controls). */
  variant?: "inbound" | "outbound";
};

/**
 * Compact iOS-style audio bubble with play/pause + progress + duration.
 */
export function VoicePlayer({ url, durationSec, variant = "outbound" }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    function tick() {
      if (!a) return;
      if (a.duration && Number.isFinite(a.duration)) {
        setProgress((a.currentTime / a.duration) * 100);
      } else {
        setProgress(Math.min(100, (a.currentTime / Math.max(durationSec, 1)) * 100));
      }
      setCurrent(a.currentTime);
    }
    a.addEventListener("timeupdate", tick);
    a.addEventListener("ended", () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
    });
    return () => {
      a.removeEventListener("timeupdate", tick);
    };
  }, [durationSec]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  }

  // Adapt colors to bubble variant.
  // Outbound = on accent-coloured bubble (white controls).
  // Inbound  = on neutral surface (accent button + neutral track for visibility).
  const isOutbound = variant === "outbound";
  const btnBg = isOutbound ? "rgba(255,255,255,0.95)" : "var(--accent)";
  const btnFg = isOutbound ? "var(--accent)" : "#ffffff";
  // Unfilled track must be visible on BOTH white (light) and dark surfaces
  const trackBg = isOutbound
    ? "rgba(255,255,255,0.32)"
    : "color-mix(in srgb, var(--text) 20%, transparent)";
  const fillBg = isOutbound ? "#ffffff" : "var(--accent)";
  const txtColor = isOutbound
    ? "rgba(255,255,255,0.92)"
    : "var(--text-secondary)";

  // Generate a simple visual waveform (deterministic from url length)
  const seed = url.length;
  const bars = Array.from({ length: 28 }, (_, i) => {
    const h = 30 + ((seed * (i + 1) * 7) % 70);
    return h;
  });

  return (
    <div className="flex items-center gap-3 min-w-0">
      <button
        type="button"
        onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95"
        style={{ backgroundColor: btnBg, color: btnFg, boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" style={{ marginLeft: 1 }} />}
      </button>

      {/* Waveform with progress mask */}
      <div className="flex h-7 min-w-0 flex-1 items-center gap-[2px] relative">
        {bars.map((h, i) => {
          const barProgress = ((i + 1) / bars.length) * 100;
          const filled = barProgress <= progress;
          return (
            <span
              key={i}
              className="rounded-full"
              style={{
                width: 2,
                height: `${h}%`,
                backgroundColor: filled ? fillBg : trackBg,
                transition: "background-color 0.2s",
              }}
            />
          );
        })}
      </div>

      <span className="shrink-0 font-mono text-[10px] tabular-nums" style={{ color: txtColor }}>
        {playing ? formatTime(current) : formatTime(durationSec)}
      </span>

      <audio ref={audioRef} src={url} preload="metadata" hidden />
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
