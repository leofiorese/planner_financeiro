/** Mini gráficos do módulo Carro, responsivos (SVG com viewBox, sem largura fixa). */

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  /** Resumo textual para leitores de tela. */
  label: string;
}

export function Sparkline({ data, color = "var(--chart-1)", height = 56, label }: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 220;
  const h = height;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (w - 12) + 6;
      const y = h - ((v - min) / range) * (h - 14) - 7;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full overflow-visible"
      style={{ height }}
      role="img"
      aria-label={label}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        points={pts}
      />
    </svg>
  );
}

interface BarChartProps {
  data: { name: string; value: number }[];
  formatValue: (v: number) => string;
  color?: string;
}

export function BarChart({ data, formatValue, color = "var(--chart-1)" }: BarChartProps) {
  if (data.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Nenhum registro no período.</div>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="space-y-2.5">
      {data.map((item) => (
        <li key={item.name} className="flex items-center gap-2.5">
          <span className="w-16 shrink-0 truncate text-xs font-medium text-muted-foreground" title={item.name}>
            {item.name}
          </span>
          <div
            className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
            role="presentation"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(6, (item.value / max) * 100))}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="min-w-20 shrink-0 text-right text-xs font-semibold tabular-nums">
            {formatValue(item.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}
