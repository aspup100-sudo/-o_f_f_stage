// 최소·최대 손잡이가 둘인 범위 슬라이더
export function DualRange({ min, max, step, value, onChange, label }: { min: number; max: number; step: number; value: [number, number]; onChange: (v: [number, number]) => void; label: string }) {
  const [lo, hi] = value;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div className="dual-range" role="group" aria-label={label}>
      <div className="dr-track" />
      <div className="dr-fill" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
      <input type="range" aria-label={`${label} 최소`} min={min} max={max} step={step} value={lo} onChange={(e) => onChange([Math.min(Number(e.target.value), hi - step), hi])} />
      <input type="range" aria-label={`${label} 최대`} min={min} max={max} step={step} value={hi} onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo + step)])} />
    </div>
  );
}
