import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { History, Eye, GitCompare } from "lucide-react";
import { getHistoryItem, compareScans } from "../utils/api";
import { scoreToColor, formatDate } from "../utils/formatters";

interface Props {
  history: any[];
  onViewItem: (result: any) => void;
  onCompare: (result: any) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold" style={{ color: scoreToColor(data.score) }}>{data.score}</p>
      <p className="text-xs text-slate-600">{data.grade} grade</p>
    </div>
  );
};

export default function HistoryPanel({ history, onViewItem, onCompare }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  const chartData = [...history].reverse().map(h => ({
    date: formatDate(h.timestamp),
    score: h.overall_score,
    grade: h.letter_grade,
    name: h.filename,
  }));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  };

  const handleView = async (scan_id: string) => {
    setLoading(scan_id);
    try {
      const result = await getHistoryItem(scan_id);
      onViewItem(result);
    } catch { } finally { setLoading(null); }
  };

  const handleCompare = async () => {
    if (selectedIds.length !== 2) return;
    setComparing(true);
    try {
      const result = await compareScans(selectedIds[0], selectedIds[1]);
      onCompare(result);
    } catch { } finally { setComparing(false); }
  };

  if (!history.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-600">No scan history yet</h3>
        <p className="text-sm text-slate-400 mt-1">Your analysis history will appear here after you run your first scan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score trend */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Score Trend</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 4" label={{ value: "75", fontSize: 10, fill: "#10b981" }} />
                <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "50", fontSize: 10, fill: "#f59e0b" }} />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: "#3b82f6", strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Recent Scans</h2>
          {selectedIds.length === 2 && (
            <button
              onClick={handleCompare}
              disabled={comparing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              <GitCompare className="h-4 w-4" />
              {comparing ? "Comparing..." : "Compare Selected (2)"}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">
                  <span className="sr-only">Select</span>
                </th>
                <th className="pb-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="pb-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">File</th>
                <th className="pb-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                <th className="pb-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade</th>
                <th className="pb-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">JD Preview</th>
                <th className="pb-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((h: any) => (
                <tr key={h.scan_id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(h.scan_id) ? "bg-blue-50" : ""}`}>
                  <td className="py-3 pr-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(h.scan_id)}
                      onChange={() => toggleSelect(h.scan_id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(h.timestamp)}</td>
                  <td className="py-3 font-medium text-slate-800 max-w-[140px] truncate">{h.filename}</td>
                  <td className="py-3 text-center">
                    <span className="text-base font-bold" style={{ color: scoreToColor(h.overall_score) }}>{h.overall_score}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${scoreToColor(h.overall_score)}20`, color: scoreToColor(h.overall_score) }}>
                      {h.letter_grade}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-slate-400 hidden md:table-cell max-w-[180px] truncate">{h.jd_preview_50_chars}</td>
                  <td className="py-3">
                    <button
                      onClick={() => handleView(h.scan_id)}
                      disabled={loading === h.scan_id}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {loading === h.scan_id ? (
                        <span className="block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
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
