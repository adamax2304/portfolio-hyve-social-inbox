import { titleizeToken } from "@/lib/format";

type StatusPillProps = {
  tone?: "warm" | "cool" | "danger" | "neutral";
  value: string;
};

const tones: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  warm: "bg-[#f8dfd5] text-[#8b4a31]",
  cool: "bg-[#d9ebe9] text-[#1f5d58]",
  danger: "bg-[#f7d8d2] text-[#8f3d2e]",
  neutral: "bg-[#ebe7df] text-[#574d44]",
};

export function StatusPill({ tone = "neutral", value }: StatusPillProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tones[tone]}`}
    >
      {titleizeToken(value)}
    </span>
  );
}
