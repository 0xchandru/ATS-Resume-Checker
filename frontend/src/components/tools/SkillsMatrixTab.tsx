import { useState } from "react";
import { Check, X, Search, ArrowUpDown } from "lucide-react";

interface Props {
  keywords: any;
}

export default function SkillsMatrixTab({ keywords }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  type SortField = "name" | "jd_count" | "resume_count" | "status" | "category" | "match_type" | "kb_source" | "match_confidence";
  const [sortField, setSortField] = useState<SortField>("jd_count");
  const [sortAsc, setSortAsc] = useState(false);

  if (!keywords) return null;

  const { matched = [], missing = [] } = keywords;

  const allSkills = [
    ...matched.map((k: any) => ({
      name: k.canonical || k.keyword || k.term || "",
      jd_count: k.jd_occurrence_count || 1,
      resume_count: k.resume_occurrence_count || (k.match_layer ? 1 : 0),
      status: "Found",
      category: k.category || "hard_skill",
      importance: k.jd_importance || "medium",
      match_type: k.match_type || "exact_match",
      kb_source: k.kb_source || (k.match_layer ? "semantic_engine" : "custom"),
      match_confidence: k.confidence || (k.match_layer === "exact" ? 1.0 : 0.8),
    })),
    ...missing.map((k: any) => ({
      name: k.canonical || k.keyword || k.term || k.skill || "",
      jd_count: k.jd_occurrence_count || 1,
      resume_count: 0,
      status: "Missing",
      category: k.category || "hard_skill",
      importance: k.jd_importance || "medium",
      match_type: "missing",
      kb_source: k.kb_source || "custom",
      match_confidence: 0,
    }))
  ];

  const filtered = allSkills.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortField === "name") diff = a.name.localeCompare(b.name);
    else if (sortField === "jd_count") diff = a.jd_count - b.jd_count;
    else if (sortField === "resume_count") diff = a.resume_count - b.resume_count;
    else if (sortField === "status") diff = a.status.localeCompare(b.status);
    else if (sortField === "category") diff = a.category.localeCompare(b.category);
    else if (sortField === "match_type") diff = a.match_type.localeCompare(b.match_type);
    else if (sortField === "kb_source") diff = a.kb_source.localeCompare(b.kb_source);
    else if (sortField === "match_confidence") diff = a.match_confidence - b.match_confidence;
    return sortAsc ? diff : -diff;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const getCategoryBadge = (cat: string) => {
    const isSoft = cat === "soft_skill" || cat === "transversal" || cat === "social";
    const isOther = cat === "other_skill" || cat === "other";
    if (isSoft) return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-500/15 text-purple-400 border border-purple-500/25">Soft</span>;
    if (isOther) return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/[0.06] text-muted-foreground border border-white/[0.08]">Other</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">Hard</span>;
  };

  const getMatchTypeBadge = (type: string) => {
    switch (type) {
      case "exact_match":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Exact</span>;
      case "normalized_match":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">Alias</span>;
      case "inferred_match":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">Inferred</span>;
      case "unsupported_claim":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/15 text-red-400 border border-red-500/25">Unsupported</span>;
      default:
        return <span className="text-muted-foreground text-xs">–</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-5 gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground">Skills Matrix</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Full breakdown of all extracted skills and their frequencies.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 w-full md:w-64 transition-all text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/[0.02] border-b border-white/[0.06]">
            <tr>
              {[
                { field: "name" as SortField, label: "Skill" },
                { field: "category" as SortField, label: "Type" },
                { field: "status" as SortField, label: "Status" },
                { field: "match_type" as SortField, label: "Match Type" },
                { field: "jd_count" as SortField, label: "JD Count", center: true },
                { field: "resume_count" as SortField, label: "Resume Count", center: true },
                { field: "kb_source" as SortField, label: "KB Source" },
                { field: "match_confidence" as SortField, label: "Confidence" },
              ].map(({ field, label, center }) => (
                <th
                  key={field}
                  className="px-5 py-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest"
                  onClick={() => handleSort(field)}
                >
                  <div className={`flex items-center gap-1.5 ${center ? "justify-center" : ""}`}>
                    {label} <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground text-sm">
                  No skills found matching your search.
                </td>
              </tr>
            ) : (
              sorted.map((s, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-foreground/90">{s.name}</td>
                  <td className="px-5 py-3.5">{getCategoryBadge(s.category)}</td>
                  <td className="px-5 py-3.5">
                    {s.status === "Found" ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                        <Check className="h-3.5 w-3.5" /> Found
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                        <X className="h-3.5 w-3.5" /> Missing
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">{getMatchTypeBadge(s.match_type)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] h-7 bg-white/[0.04] border border-white/[0.07] rounded-lg font-mono font-bold text-foreground/80 text-xs px-2">
                      {s.jd_count}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[2rem] h-7 rounded-lg font-mono font-bold text-xs px-2 ${
                      s.resume_count > 0
                        ? s.resume_count >= s.jd_count
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-amber-500/15 text-amber-400"
                        : "bg-red-500/12 text-red-400"
                    }`}>
                      {s.resume_count}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold px-2 py-1 bg-white/[0.04] border border-white/[0.07] rounded-lg text-muted-foreground capitalize">
                      {s.kb_source.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {s.match_confidence > 0 ? (
                      <span className="text-xs font-bold text-foreground/80 tabular-nums">
                        {Math.round(s.match_confidence * 100)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">–</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
