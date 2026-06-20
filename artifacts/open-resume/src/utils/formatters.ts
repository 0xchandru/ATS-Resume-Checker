export function scoreToGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "B+";
  if (score >= 75) return "B";
  if (score >= 65) return "C+";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

export function scoreToColor(score: number): string {
  if (score >= 75) return "#10b981"; // emerald-500
  if (score >= 50) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

export function scoreToBgClass(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function scoreToTextClass(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function confidenceToPercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function severityToColor(severity: string): string {
  switch (severity) {
    case "critical": return "text-red-600";
    case "warning": return "text-amber-600";
    case "info": return "text-blue-600";
    case "pass": return "text-emerald-600";
    default: return "text-slate-500";
  }
}

export function severityToBgClass(severity: string): string {
  switch (severity) {
    case "critical": return "bg-red-50 border-red-200";
    case "warning": return "bg-amber-50 border-amber-200";
    case "info": return "bg-blue-50 border-blue-200";
    case "pass": return "bg-emerald-50 border-emerald-200";
    default: return "bg-slate-50 border-slate-200";
  }
}

export function matchLayerBadgeClass(layer: string): string {
  switch (layer) {
    case "alias": return "bg-purple-100 text-purple-700";
    case "exact": return "bg-blue-100 text-blue-700";
    case "kb_lookup": return "bg-cyan-100 text-cyan-700";
    case "fuzzy": return "bg-amber-100 text-amber-700";
    case "semantic": return "bg-orange-100 text-orange-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function importanceDotClass(importance: string): string {
  switch (importance) {
    case "critical": return "bg-red-500";
    case "high": return "bg-amber-500";
    case "medium": return "bg-slate-400";
    default: return "bg-slate-300";
  }
}

export function tierBadgeClass(tier: string): string {
  switch (tier) {
    case "tier1": return "bg-yellow-100 text-yellow-800";
    case "tier2": return "bg-slate-100 text-slate-700";
    case "startup": return "bg-teal-100 text-teal-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "critical": return "bg-red-100 text-red-700 border-red-200";
    case "important": return "bg-amber-100 text-amber-700 border-amber-200";
    case "nice_to_have": return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export function formatDate(isoString: string): string {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}
