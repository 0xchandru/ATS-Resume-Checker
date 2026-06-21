import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { History, Eye, GitCompare, Loader2 } from "lucide-react";
import { getHistoryItem, compareScans } from "../../utils/api";
import { scoreToColor, formatDate } from "../../utils/formatters";

interface Props {
  history: any[];
  onViewItem: (result: any) => void;
  onCompare: (result: any) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-[#11121a] border border-white/[0.08] rounded-xl shadow-xl p-3 min-w-[120px]">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color: scoreToColor(data.score) }}>{data.score}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{data.grade} · {data.name}</p>
    </div>
  );
};

export default function HistoryPanel({ history, onViewItem, onCompare }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  const chartData = [...history].reverse().map(h => ({
    date: formatDate(h.timestamp), score: h.overall_score, grade: h.letter_grade, name: h.filename,
  }));

  const toggleSelect = (id: string) =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );

  const handleView = async (scan_id: string) => {
    setLoading(scan_id);
    try { onViewItem(await getHistoryItem(scan_id)); } catch {} finally { setLoading(null); }
  };

  const handleCompare = async () => {
    if (selectedIds.length !== 2) return;
    setComparing(true);
    try { onCompare(await compareScans(selectedIds[0], selectedIds[1])); } catch {} finally { setComparing(false); }
  };

  if (!history.length) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-14 text-center">
        <div className="h-16 w-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
          <History className="h-8 w-8 text-muted-foreground/30" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No scan history yet</h3>
        <p className="text-sm text-muted-foreground mt-1.5">Your analysis history will appear here after your first scan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Score trend chart */}
      {chartData.length > 1 && (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-4">Score Trend</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)", fontFamily: "inherit" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)", fontFamily: "inherit" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5}
                  label={{ value: "75", fontSize: 9, fill: "#10b981", position: "right" }} />
                <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5}
                  label={{ value: "50", fontSize: 9, fill: "#f59e0b", position: "right" }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  dot={{ fill: "#7c3aed", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "#a78bfa" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Scans table */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider">
            Recent Scans
            <span className="ml-2 text-muted-foreground font-normal normal-case text-xs">({history.length})</span>
          </h2>
          {selectedIds.length === 2 && (
            <button
              onClick={handleCompare}
              disabled={comparing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity shadow-md shadow-violet-500/20"
            >
              {comparing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitCompare className="h-3.5 w-3.5" />}
              {comparing ? "Comparing…" : "Compare Selected"}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="pb-3 pt-3 px-5 w-8" />
                <th className="pb-3 pt-3 px-2 text-left text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Date</th>
                <th className="pb-3 pt-3 px-2 text-left text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">File</th>
                <th className="pb-3 pt-3 px-2 text-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Score</th>
                <th className="pb-3 pt-3 px-2 text-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Grade</th>
                <th className="pb-3 pt-3 px-2 text-left text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest hidden md:table-cell">JD Preview</th>
                <th className="pb-3 pt-3 pr-5 w-10" />
              </tr>
            </thead>
            <tbody>
              {history.map((h: any) => (
                <tr
                  key={h.scan_id}
                  className={`border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors ${
                    selectedIds.includes(h.scan_id) ? "bg-violet-500/5" : ""
                  }`}
                >
                  <td className="py-3.5 px-5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(h.scan_id)}
                      onChange={() => toggleSelect(h.scan_id)}
                      className="rounded border-white/20 accent-violet-600 cursor-pointer"
                    />
                  </td>
                  <td className="py-3.5 px-2 text-muted-foreground text-xs whitespace-nowrap">{formatDate(h.timestamp)}</td>
                  <td className="py-3.5 px-2 max-w-[160px]">
                    {h.scan_name ? (
                      <div>
                        <p className="font-semibold text-foreground truncate text-sm leading-tight">{h.scan_name}</p>
                        <p className="text-xs text-muted-foreground truncate leading-tight">{h.filename}</p>
                      </div>
                    ) : (
                      <p className="font-medium text-foreground/90 truncate text-sm">{h.filename}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    <span className="text-base font-black tabular-nums" style={{ color: scoreToColor(h.overall_score) }}>
                      {h.overall_score}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    <span
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${scoreToColor(h.overall_score)}22`,
                        color: scoreToColor(h.overall_score),
                        border: `1px solid ${scoreToColor(h.overall_score)}40`,
                      }}
                    >
                      {h.letter_grade}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                    {h.jd_preview_50_chars}
                  </td>
                  <td className="py-3.5 pr-5">
                    <button
                      onClick={() => handleView(h.scan_id)}
                      disabled={loading === h.scan_id}
                      className="p-2 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-violet-400 transition-colors"
                    >
                      {loading === h.scan_id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Eye className="h-4 w-4" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
