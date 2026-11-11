type MetricCardProps = {
  label: string;
  value: string | number;
  hint: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-[0_20px_60px_rgba(61,45,34,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7f73]">
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#221c17]">
        {value}
      </p>
      <p className="mt-3 max-w-[18rem] text-sm leading-6 text-[#65594d]">
        {hint}
      </p>
    </div>
  );
}
