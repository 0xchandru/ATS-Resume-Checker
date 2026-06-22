import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface ScoreEntry {
  ts: number;
  score: number;
  label: string;
}

interface Props {
  history: ScoreEntry[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { score, label } = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-foreground">{score}/100</p>
      <p className="text-muted-foreground truncate max-w-[160px]">{label}</p>
    </div>
  );
};

export default function ScoreHistoryChart({ history }: Props) {
  if (history.length < 2) return null;

  const first = history[0].score;
  const last = history[history.length - 1].score;
  const delta = last - first;
  const data = history.map((e) => ({ ...e, time: formatTime(e.ts) }));
  const minScore = Math.max(0, Math.min(...history.map(e => e.score)) - 10);
  const maxScore = Math.min(100, Math.max(...history.map(e => e.score)) + 5);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Score Progress</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{history.length} scans this session</p>
        </div>
        <div className="flex items-center gap-1.5">
          {delta > 0 ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : delta < 0 ? (
            <TrendingDown className="w-4 h-4 text-red-400" />
          ) : (
            <Minus className="w-4 h-4 text-muted-foreground" />
          )}
          <span
            className={`text-sm font-bold ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-muted-foreground"}`}
          >
            {delta > 0 ? "+" : ""}{delta} pts
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minScore, maxScore]}
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={75} stroke="rgba(16,185,129,0.2)" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: "#6366f1", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#6366f1" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
