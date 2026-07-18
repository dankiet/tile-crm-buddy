import { useState, useEffect } from "react";

const PRESETS: Array<{ label: string; min: number; max: number }> = [
  { label: "Dưới 300k", min: 0, max: 300_000 },
  { label: "300k – 500k", min: 300_000, max: 500_000 },
  { label: "500k – 1tr", min: 500_000, max: 1_000_000 },
  { label: "Trên 1tr", min: 1_000_000, max: 0 },
];

function formatInput(v: number): string {
  if (!v) return "";
  return v.toLocaleString("vi-VN");
}
function parseInput(raw: string): number {
  const d = raw.replace(/[^\d]/g, "");
  return d ? Number(d) : 0;
}

type Props = {
  min: number;
  max: number;
  onChange: (patch: { min: number; max: number }) => void;
};

export function PriceFilter({ min, max, onChange }: Props) {
  const [a, setA] = useState(formatInput(min));
  const [b, setB] = useState(formatInput(max));

  // Sync khi thay đổi từ ngoài (vd clear)
  useEffect(() => setA(formatInput(min)), [min]);
  useEffect(() => setB(formatInput(max)), [max]);

  const commit = (nextA: string, nextB: string) => {
    onChange({ min: parseInput(nextA), max: parseInput(nextB) });
  };

  const fieldCls =
    "h-9 w-full text-sm px-3 rounded-lg bg-transparent border border-border/80 outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/15";

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-foreground">Khoảng giá (VND/m²)</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <input
          value={a}
          onChange={(e) => setA(e.target.value)}
          onBlur={() => commit(a, b)}
          onKeyDown={(e) => e.key === "Enter" && commit(a, b)}
          placeholder="Từ"
          inputMode="numeric"
          className={fieldCls}
        />
        <span className="text-muted-foreground/60 text-xs">→</span>
        <input
          value={b}
          onChange={(e) => setB(e.target.value)}
          onBlur={() => commit(a, b)}
          onKeyDown={(e) => e.key === "Enter" && commit(a, b)}
          placeholder="Đến"
          inputMode="numeric"
          className={fieldCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map((p) => {
          const active = min === p.min && max === p.max;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setA(formatInput(p.min));
                setB(formatInput(p.max));
                onChange({ min: p.min, max: p.max });
              }}
              className={
                active
                  ? "h-8 text-xs font-medium rounded-md bg-terracotta text-primary-foreground"
                  : "h-8 text-xs font-medium rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface-strong/60"
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {(min || max) ? (
        <button
          type="button"
          onClick={() => {
            setA("");
            setB("");
            onChange({ min: 0, max: 0 });
          }}
          className="text-xs text-muted-foreground hover:text-terracotta"
        >
          Bỏ khoảng giá
        </button>
      ) : null}
    </div>
  );
}
