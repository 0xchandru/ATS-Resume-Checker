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

  // Normalize all skills into a single array for the table
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

  // Filter
  const filtered = allSkills.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Sort
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
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for new sorts
    }
  };

  const getCategoryBadge = (cat: string) => {
    const isSoft = cat === "soft_skill" || cat === "transversal" || cat === "social";
    const isOther = cat === "other_skill" || cat === "other";
    if (isSoft) return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20">Soft</span>;
    if (isOther) return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">Other</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">Hard</span>;
  };

  const getMatchTypeBadge = (type: string) => {
    switch (type) {
      case "exact_match":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Exact</span>;
      case "normalized_match":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">Alias</span>;
      case "inferred_match":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Inferred</span>;
      case "unsupported_claim":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/10 text-red-500 border border-red-500/20">Unsupported</span>;
      default:
        return <span className="text-muted-foreground">-</span>;
    }
  };

  return (
    <div className="p-6 bg-card rounded-b-2xl border border-t-0 border-border">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground">Skills Matrix</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed breakdown of all extracted skills and their frequencies.
          </p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full md:w-64 transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1.5">Skill <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("category")}>
                <div className="flex items-center gap-1.5">Type <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("status")}>
                <div className="flex items-center gap-1.5">Status <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("match_type")}>
                <div className="flex items-center gap-1.5">Match Type <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-6 py-4 text-center cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("jd_count")}>
                <div className="flex items-center justify-center gap-1.5">JD Count <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-6 py-4 text-center cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("resume_count")}>
                <div className="flex items-center justify-center gap-1.5">Resume Count <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("kb_source")}>
                <div className="flex items-center gap-1.5">KB Source <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("match_confidence")}>
                <div className="flex items-center gap-1.5">Confidence <ArrowUpDown className="h-3 w-3" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                  No skills found matching your search.
                </td>
              </tr>
            ) : (
              sorted.map((s, i) => (
                <tr key={i} className="bg-card hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">
                    {s.name}
                  </td>
                  <td className="px-6 py-4">
                    {getCategoryBadge(s.category)}
                  </td>
                  <td className="px-6 py-4">
                    {s.status === "Found" ? (
                      <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                        <Check className="h-4 w-4" /> Found
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-500 font-semibold">
                        <X className="h-4 w-4" /> Missing
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getMatchTypeBadge(s.match_type)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] h-8 bg-muted rounded font-mono font-bold text-foreground">
                      {s.jd_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[2rem] h-8 rounded font-mono font-bold ${
                      s.resume_count > 0 
                        ? s.resume_count >= s.jd_count 
                          ? "bg-emerald-500/10 text-emerald-500" 
                          : "bg-amber-500/10 text-amber-500"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {s.resume_count}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-md text-muted-foreground capitalize">
                      {s.kb_source.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {s.match_confidence > 0 ? (
                      <span className="text-xs font-bold text-foreground">
                        {Math.round(s.match_confidence * 100)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
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
